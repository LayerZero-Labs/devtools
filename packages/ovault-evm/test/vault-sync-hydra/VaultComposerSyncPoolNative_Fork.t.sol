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
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

// LayerZero imports
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { IStargatePoolWithPath as IStargatePool } from "../mocks/IMocks.sol";

// OFT Adapter import
import { MockOFTAdapter as OFTAdapter } from "../mocks/MockOFT.sol";

// Contract imports
import { IWETH } from "../../contracts/interfaces/IWETH.sol";
import { VaultComposerSyncPoolNative } from "../../contracts/VaultComposerSyncPoolNative.sol";
import { IVaultComposerSyncPoolNative } from "../../contracts/interfaces/IVaultComposerSyncPoolNative.sol";

// Forge imports
import { Test, console } from "forge-std/Test.sol";

contract VaultComposerSyncPoolNativeForkTest is Test {
    using OptionsBuilder for bytes;
    using OFTMsgCodec for address;

    uint256 public constant PINNED_BLOCK = 23_435_096;

    // Mainnet addresses
    address public constant ASSET_OFT = 0x77b2043768d28E9C9aB44E1aBfC95944bcE57931;
    address public constant VAULT = 0xBEEf050ecd6a16c4e7bfFbB52Ebba7846C4b8cD4;
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
    IWETH public assetERC20;
    IERC4626 public vault;

    ILayerZeroEndpointV2 public endpoint;
    VaultComposerSyncPoolNative public composer;

    bytes32 public randomGUID;

    // Test constants
    uint256 public constant INITIAL_NATIVE = 100 ether;
    uint256 public constant TOKENS_TO_SEND = 1 ether;

    uint256 public constant TO_LD = 1e12;

    function setUp() public {
        // Setup fork
        string memory rpcUrl = vm.envOr("RPC_URL_ETHEREUM_MAINNET", vm.rpcUrl("ethereum_mainnet"));
        vm.createSelectFork(rpcUrl, PINNED_BLOCK);

        // Initialize contract interfaces
        hydraAssetOFT = IStargatePool(ASSET_OFT);
        vault = IERC4626(VAULT);
        endpoint = ILayerZeroEndpointV2(LZ_ENDPOINT_V2);
        assetERC20 = IWETH(vault.asset());

        // Deploy OFTAdapter for share token (vault shares)
        vm.startPrank(deployer);
        shareOFTAdapter = new OFTAdapter(
            VAULT, // The vault token (shares)
            LZ_ENDPOINT_V2, // LayerZero endpoint
            deployer // Owner
        );

        // Deploy VaultComposerSyncHydra
        composer = new VaultComposerSyncPoolNative(
            address(vault), // VAULT
            address(hydraAssetOFT), // ASSET_OFT (Hydra Asset)
            address(shareOFTAdapter), // SHARE_OFT
            hubRecoveryAddress // HUB_RECOVERY_ADDRESS
        );
        vm.stopPrank();

        // Setup labels for better debugging
        vm.label(ASSET_OFT, "HydraAssetOFT");
        vm.label(VAULT, "Vault");
        vm.label(LZ_ENDPOINT_V2, "LZEndpointV2");
        vm.label(address(shareOFTAdapter), "ShareOFTAdapter");
        vm.label(address(composer), "VaultComposerSyncPoolNative");
        vm.label(userA, "UserA");
        vm.label(hubRecoveryAddress, "HubRecoveryAddress");
        vm.label(executor, "Executor");
        vm.label(deployer, "Deployer");
        vm.label(recoveryAddress, "RecoveryAddress");

        // Give users some ETH for gas
        vm.deal(userA, INITIAL_NATIVE);
        vm.deal(executor, INITIAL_NATIVE);
        vm.deal(deployer, INITIAL_NATIVE);
        vm.deal(LZ_ENDPOINT_V2, type(uint64).max);

        randomGUID = bytes32(vm.randomBytes(32));
    }

    function test_setup() public view {
        console.log("assetERC20", address(assetERC20));
        console.log("composer.ASSET_ERC20()", composer.ASSET_ERC20());
        console.log("hydraAssetOFT.token()", hydraAssetOFT.token());
        // Validate deployment addresses
        assertEq(address(composer.VAULT()), address(vault), "Vault address mismatch");
        assertEq(composer.ASSET_OFT(), address(hydraAssetOFT), "Asset OFT address mismatch");
        assertEq(composer.SHARE_OFT(), address(shareOFTAdapter), "Share OFT address mismatch");
        assertEq(hydraAssetOFT.token(), address(0), "Asset OFT address mismatch");

        // Validate OFTAdapter setup
        assertEq(shareOFTAdapter.token(), address(vault), "OFTAdapter token mismatch");
        assertEq(address(shareOFTAdapter.endpoint()), LZ_ENDPOINT_V2, "OFTAdapter endpoint mismatch");
        assertEq(shareOFTAdapter.owner(), deployer, "OFTAdapter owner mismatch");

        assertEq(shareOFTAdapter.approvalRequired(), true, "OFTAdapter approvalRequired mismatch");

        assertGt(hydraAssetOFT.paths(ARB_EID).credit, 0, "Hydra Asset OFT path credit mismatch for arb");
        assertLt(hydraAssetOFT.paths(ARB_EID).credit, UNLIMITED_CREDIT, "Hydra Asset OFT path credit mismatch for arb");

        assertEq(
            hydraAssetOFT.paths(BERA_EID).credit,
            UNLIMITED_CREDIT,
            "Hydra Asset OFT path credit mismatch for bera"
        );
    }

    function test_forkPoolNativeFailedDepositFromArbPool() public {
        uint256 credit = hydraAssetOFT.paths(ARB_EID).credit;
        uint256 amtToSend = (credit * TO_LD) + 1;
        assertGt(amtToSend, credit, "Amount to send should be greater than the credit");

        vm.deal(address(composer), amtToSend);

        SendParam memory sendParam;

        bytes memory composeMsg = OFTComposeMsgCodec.encode(
            0,
            ARB_EID,
            amtToSend,
            abi.encodePacked(userA.addressToBytes32(), abi.encode(sendParam, hubRecoveryAddress, 1 wei))
        );

        assertEq(address(composer).balance, amtToSend, "Composer should have the amount to send");
        assertEq(assetERC20.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");

        vm.startPrank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 1 wei }(address(hydraAssetOFT), randomGUID, composeMsg, executor, "");
        vm.stopPrank();

        assertEq(assetERC20.balanceOf(address(composer)), 0, "Composer should have 0 balance");
        assertEq(
            assetERC20.balanceOf(hubRecoveryAddress),
            amtToSend,
            "HubRecoveryAddress should have the amount to send"
        );
    }

    function test_forkPoolNativeFailedDepositFromBeraOFT() public {
        uint256 credit = hydraAssetOFT.paths(BERA_EID).credit;
        assertEq(credit, UNLIMITED_CREDIT, "Hydra Asset OFT path credit mismatch for bera");
        uint256 amtToSend = 1e18;

        vm.deal(address(composer), amtToSend);

        SendParam memory sendParam;
        sendParam.minAmountLD = type(uint256).max;

        bytes memory composeMsg = OFTComposeMsgCodec.encode(
            0,
            BERA_EID,
            amtToSend,
            abi.encodePacked(userA.addressToBytes32(), abi.encode(sendParam, hubRecoveryAddress, 0.1 ether))
        );

        assertEq(address(composer).balance, amtToSend, "Composer should have the amount to send");
        assertEq(assetERC20.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");

        vm.startPrank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(hydraAssetOFT), randomGUID, composeMsg, executor, "");
        vm.stopPrank();

        assertEq(address(composer).balance, 0, "Composer should have 0 balance");
        assertEq(assetERC20.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");
    }

    function test_forkPoolNativeRedeemToArbPool() public {
        uint64 credit = hydraAssetOFT.paths(ARB_EID).credit;
        uint256 amtToDeposit = (credit * TO_LD) + 1;

        uint256 composerBalancePreDeposit = vault.balanceOf(address(composer));
        assertEq(composerBalancePreDeposit, 0, "Composer should have 0 share balance before deposit");

        vm.deal(address(this), amtToDeposit);
        assetERC20.deposit{ value: amtToDeposit }();
        assetERC20.approve(address(vault), amtToDeposit);
        vault.deposit(amtToDeposit, address(composer));

        uint256 amtToRedeem = vault.balanceOf(address(composer));

        assertGt(amtToRedeem, composerBalancePreDeposit, "Composer should have more share balance after deposit");

        SendParam memory sendParam;
        sendParam.dstEid = ARB_EID;

        bytes memory redeemMsg = OFTComposeMsgCodec.encode(
            0,
            BERA_EID, // does not matter since we are testing asset functionality
            amtToRedeem,
            abi.encodePacked(userA.addressToBytes32(), abi.encode(sendParam, hubRecoveryAddress, 0.1 ether))
        );

        assertEq(
            assetERC20.balanceOf(address(hubRecoveryAddress)),
            0,
            "HubRecoveryAddress should have 0 asset balance"
        );

        vm.startPrank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(shareOFTAdapter), randomGUID, redeemMsg, executor, "");
        vm.stopPrank();

        assertEq(vault.balanceOf(address(composer)), 0, "Composer should have 0 share balance");
        assertEq(address(hubRecoveryAddress).balance, 0, "HubRecoveryAddress should have more asset balance");
        assertEq(assetERC20.balanceOf(address(hubRecoveryAddress)), 0, "HubRecoveryAddress should have 0 weth tokens");
    }

    function test_forkPoolNativeRedeemToBeraOFT() public {
        uint256 feeAmt = 0.1 ether;
        uint64 credit = hydraAssetOFT.paths(ARB_EID).credit;
        uint256 amtToDeposit = (credit * TO_LD) + 1;
        console.log("amtToDeposit", amtToDeposit);

        uint256 composerBalancePreDeposit = vault.balanceOf(address(composer));
        assertEq(composerBalancePreDeposit, 0, "Composer should have 0 share balance before deposit");

        vm.deal(address(this), amtToDeposit);
        assetERC20.deposit{ value: amtToDeposit }();
        assetERC20.approve(address(vault), amtToDeposit);
        vault.deposit(amtToDeposit, address(composer));

        uint256 amtToRedeem = vault.balanceOf(address(composer));

        assertGt(amtToRedeem, composerBalancePreDeposit, "Composer should have more share balance after deposit");

        SendParam memory sendParam;
        sendParam.dstEid = BERA_EID;

        bytes memory redeemMsg = OFTComposeMsgCodec.encode(
            0,
            ARB_EID, // does not matter since we are testing asset functionality
            amtToRedeem,
            abi.encodePacked(userA.addressToBytes32(), abi.encode(sendParam, hubRecoveryAddress, feeAmt))
        );

        assertEq(
            assetERC20.balanceOf(address(hubRecoveryAddress)),
            0,
            "HubRecoveryAddress should have 0 asset balance"
        );

        vm.startPrank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: feeAmt }(address(shareOFTAdapter), randomGUID, redeemMsg, executor, "");
        vm.stopPrank();

        assertEq(vault.balanceOf(address(composer)), 0, "Composer should have 0 share balance");
        assertEq(address(hubRecoveryAddress).balance, 0, "HubRecoveryAddress should have more asset balance");
        assertEq(assetERC20.balanceOf(address(hubRecoveryAddress)), 0, "HubRecoveryAddress should have 0 weth tokens");
    }
}
