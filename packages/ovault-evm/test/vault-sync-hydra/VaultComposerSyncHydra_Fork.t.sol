// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// OApp imports
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppOptionsType3.sol";

// OpenZeppelin imports
import { IMockUSDC as ERC20 } from "../mocks/MockERC20.sol";
import { IStargatePoolWithPath as IStargatePool } from "../mocks/IMocks.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

// LayerZero imports
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

// OFT Adapter import
import { MockOFTAdapter as OFTAdapter } from "../mocks/MockOFT.sol";

// Contract imports
import { VaultComposerSyncHydra } from "../../contracts/VaultComposerSyncHydra.sol";
import { IVaultComposerSyncHydra } from "../../contracts/interfaces/IVaultComposerSyncHydra.sol";

// Forge imports
import "forge-std/Test.sol";
import "forge-std/console.sol";

contract VaultComposerSyncHydraForkTest is Test {
    using OptionsBuilder for bytes;
    using OFTMsgCodec for address;

    // Mainnet addresses
    address public constant HYDRA_ASSET_OFT = 0xc026395860Db2d07ee33e05fE50ed7bD583189C7;
    address public constant VAULT = 0xdA89af5bF2eb0B225d787aBfA9095610f2E79e7D;
    address public constant LZ_ENDPOINT_V2 = 0x1a44076050125825900e736c501f859c50fE728c;
    uint32 public constant ARB_EID = 30110;
    uint32 public constant BERA_EID = 30362;

    uint256 public constant UNLIMITED_CREDIT = type(uint64).max;

    // Test addresses
    address public userA = makeAddr("userA");
    address public hubRecoveryAddress = makeAddr("hubRecoveryAddress");
    address public deployer = makeAddr("deployer");
    address public executor = makeAddr("executor");

    address public recoveryAddress = makeAddr("recoveryAddress");

    // Contract instances
    IStargatePool public hydraAssetOFT;
    OFTAdapter public shareOFTAdapter;
    ERC20 public assetERC20;
    IERC4626 public vault;

    ILayerZeroEndpointV2 public endpoint;
    VaultComposerSyncHydra public composer;

    // Test constants
    uint256 public constant INITIAL_NATIVE = 100 ether;
    uint256 public constant INITIAL_BALANCE = 10_000e6;
    uint256 public constant TOKENS_TO_SEND = 100e6;

    function setUp() public {
        // Setup fork
        string memory rpcUrl;
        try vm.envString("RPC_URL_ETHEREUM_MAINNET") returns (string memory envRpcUrl) {
            rpcUrl = envRpcUrl;
        } catch {
            rpcUrl = "https://mainnet.gateway.tenderly.co";
        }

        vm.createSelectFork(rpcUrl);

        // Initialize contract interfaces
        hydraAssetOFT = IStargatePool(HYDRA_ASSET_OFT);
        vault = IERC4626(VAULT);
        endpoint = ILayerZeroEndpointV2(LZ_ENDPOINT_V2);
        assetERC20 = ERC20(hydraAssetOFT.token());

        // Deploy OFTAdapter for share token (vault shares)
        vm.startPrank(deployer);
        shareOFTAdapter = new OFTAdapter(
            VAULT, // The vault token (shares)
            LZ_ENDPOINT_V2, // LayerZero endpoint
            deployer // Owner
        );

        // Deploy VaultComposerSyncHydra
        composer = new VaultComposerSyncHydra(
            address(vault), // VAULT
            address(hydraAssetOFT), // ASSET_OFT (Hydra Asset)
            address(shareOFTAdapter), // SHARE_OFT
            hubRecoveryAddress // HUB_RECOVERY_ADDRESS
        );
        vm.stopPrank();

        // Setup labels for better debugging
        vm.label(HYDRA_ASSET_OFT, "HydraAssetOFT");
        vm.label(VAULT, "Vault");
        vm.label(LZ_ENDPOINT_V2, "LZEndpointV2");
        vm.label(address(shareOFTAdapter), "ShareOFTAdapter");
        vm.label(address(composer), "VaultComposerSyncHydra");
        vm.label(userA, "UserA");
        vm.label(hubRecoveryAddress, "HubRecoveryAddress");
        vm.label(executor, "Executor");
        vm.label(deployer, "Deployer");
        vm.label(recoveryAddress, "RecoveryAddress");

        // Give users some ETH for gas
        vm.deal(userA, INITIAL_NATIVE);
        vm.deal(executor, INITIAL_NATIVE);
        vm.deal(deployer, INITIAL_NATIVE);
        vm.deal(LZ_ENDPOINT_V2, INITIAL_NATIVE);

        vm.prank(0xE982615d461DD5cD06575BbeA87624fda4e3de17); // USDC Master Minter
        assetERC20.configureMinter(address(this), type(uint256).max);
    }

    function test_setup() public view {
        // Validate deployment addresses
        assertEq(address(composer.VAULT()), address(vault), "Vault address mismatch");
        assertEq(composer.ASSET_OFT(), address(hydraAssetOFT), "Asset OFT address mismatch");
        assertEq(composer.SHARE_OFT(), address(shareOFTAdapter), "Share OFT address mismatch");
        assertEq(composer.ASSET_ERC20(), hydraAssetOFT.token(), "Asset OFT address mismatch");

        // Validate OFTAdapter setup
        assertEq(shareOFTAdapter.token(), address(vault), "OFTAdapter token mismatch");
        assertEq(address(shareOFTAdapter.endpoint()), LZ_ENDPOINT_V2, "OFTAdapter endpoint mismatch");
        assertEq(shareOFTAdapter.owner(), deployer, "OFTAdapter owner mismatch");

        assertEq(shareOFTAdapter.approvalRequired(), true, "OFTAdapter approvalRequired mismatch");
        assertEq(assetERC20.balanceOf(userA), INITIAL_BALANCE, "Asset ERC20 balance mismatch");

        assertGt(hydraAssetOFT.paths(ARB_EID).credit, 0, "Hydra Asset OFT path credit mismatch for arb");
        assertLt(hydraAssetOFT.paths(ARB_EID).credit, UNLIMITED_CREDIT, "Hydra Asset OFT path credit mismatch for arb");

        assertEq(
            hydraAssetOFT.paths(BERA_EID).credit,
            UNLIMITED_CREDIT,
            "Hydra Asset OFT path credit mismatch for bera"
        );
    }

    function test_forkSendFromArbPool() public {
        uint64 credit = hydraAssetOFT.paths(ARB_EID).credit;
        uint256 amtToSend = type(uint64).max;
        assertGt(amtToSend, credit, "Amount to send should be greater than the credit");

        assetERC20.mint(address(composer), amtToSend);

        SendParam memory sendParam;

        bytes memory composeMsg = OFTComposeMsgCodec.encode(
            0,
            ARB_EID,
            amtToSend,
            abi.encodePacked(userA.addressToBytes32(), abi.encode(sendParam, hubRecoveryAddress, 0.1 ether))
        );

        bytes32 guid = bytes32(vm.randomBytes(32));

        assertEq(assetERC20.balanceOf(address(composer)), amtToSend, "Composer should have the amount to send");
        assertEq(assetERC20.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");

        vm.startPrank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(hydraAssetOFT), guid, composeMsg, executor, "");
        vm.stopPrank();

        assertEq(assetERC20.balanceOf(address(composer)), 0, "Composer should have 0 balance");
        assertEq(
            assetERC20.balanceOf(hubRecoveryAddress),
            amtToSend,
            "HubRecoveryAddress should have the amount to send"
        );
    }

    function test_forkSendFromBeraOFT() public {
        uint64 credit = hydraAssetOFT.paths(BERA_EID).credit;
        uint256 amtToSend = 100e6;
        assertLt(amtToSend, credit, "Amount to send should be less than the credit");

        assetERC20.mint(address(composer), amtToSend);

        SendParam memory sendParam;
        sendParam.minAmountLD = type(uint256).max;

        bytes memory composeMsg = OFTComposeMsgCodec.encode(
            0,
            BERA_EID,
            amtToSend,
            abi.encodePacked(userA.addressToBytes32(), abi.encode(sendParam, hubRecoveryAddress, 0.1 ether))
        );

        bytes32 guid = bytes32(vm.randomBytes(32));

        assertEq(assetERC20.balanceOf(address(composer)), amtToSend, "Composer should have the amount to send");
        assertEq(assetERC20.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");

        vm.startPrank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(hydraAssetOFT), guid, composeMsg, executor, "");
        vm.stopPrank();

        assertEq(assetERC20.balanceOf(address(composer)), 0, "Composer should have 0 balance");
        assertEq(assetERC20.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");
    }
}
