// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// OpenZeppelin imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

// LayerZero imports - libraries
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";

// LayerZero imports - interfaces and types (structs)
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppOptionsType3.sol";

// Contract and interface imports
import { VaultComposerSync } from "../../contracts/VaultComposerSync.sol";
import { VaultComposerSyncNative } from "../../contracts/VaultComposerSyncNative.sol";

// Mock imports for OFT Adapter
import { MockOFTAdapter } from "../mocks/MockOFT.sol";
import { IMockUSDC as IUSDC } from "../mocks/MockERC20.sol";
import { StargatePool } from "../mocks/MockOFT.sol";

// Forge imports
import { Test } from "forge-std/Test.sol";

contract VaultComposerSyncSTG_BaseTest is Test {
    using OptionsBuilder for bytes;
    using OFTMsgCodec for address;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    uint256 public constant PINNED_BLOCK = 23_500_000;
    uint64 public constant UNLIMITED_CREDIT = type(uint64).max;

    // Ethereum Mainnet contract addresses
    address public constant USDC_POOL = 0xc026395860Db2d07ee33e05fE50ed7bD583189C7;
    address public constant ETH_POOL = 0x77b2043768d28E9C9aB44E1aBfC95944bcE57931;
    address public constant USDC_VAULT = 0xd63070114470f685b75B74D60EEc7c1113d33a3D;
    address public constant ETH_VAULT = 0xBEEf050ecd6a16c4e7bfFbB52Ebba7846C4b8cD4;
    address public constant LZ_ENDPOINT_V2 = 0x1a44076050125825900e736c501f859c50fE728c;

    // Endpoint IDs
    uint32 public constant ETH_EID = 30101; // Primary network that we are testing on
    uint32 public constant ARB_EID = 30110;
    uint32 public constant BERA_EID = 30362;

    bytes public OPTIONS_LZRECEIVE_100k = OptionsBuilder.newOptions().addExecutorLzReceiveOption(100_000, 0);

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONTRACT INSTANCES
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // Stargate Pools (real mainnet contracts)
    StargatePool public usdcPool;
    StargatePool public ethPool;

    // Share OFT Adapters (deployed for testing)
    MockOFTAdapter public usdcShareOFTAdapter;
    MockOFTAdapter public ethShareOFTAdapter;

    // Underlying tokens and vaults (real mainnet contracts)
    IUSDC public usdcToken;
    IERC20 public wethToken;
    IERC4626 public usdcVault;
    IERC4626 public ethVault;

    // Composers (deployed for testing)
    VaultComposerSync public usdcComposer;
    VaultComposerSyncNative public ethComposer;

    // LayerZero endpoint
    ILayerZeroEndpointV2 public endpoint;

    // Test addresses
    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    address public deployer = makeAddr("deployer");
    address public executor = makeAddr("executor");

    // Test parameters
    uint256 public constant INITIAL_BALANCE = 100 ether;
    uint256 public constant TOKENS_TO_SEND = 1 ether;
    uint256 public constant ETH_TO_LD = 1e12;

    bytes32 public randomGUID;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // SETUP
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function setUp() public virtual {
        // Setup fork at pinned block
        string memory rpcUrl = vm.envOr("RPC_URL_ETHEREUM_MAINNET", vm.rpcUrl("ethereum_mainnet"));
        vm.createSelectFork(rpcUrl, PINNED_BLOCK);

        // Initialize real mainnet contracts
        usdcPool = StargatePool(USDC_POOL);
        ethPool = StargatePool(ETH_POOL);
        usdcVault = IERC4626(USDC_VAULT);
        ethVault = IERC4626(ETH_VAULT);
        endpoint = ILayerZeroEndpointV2(LZ_ENDPOINT_V2);

        // Get underlying tokens
        usdcToken = IUSDC(usdcPool.token());
        wethToken = IERC20(ethVault.asset());

        // Deploy OFT Adapters for share tokens
        vm.startPrank(deployer);

        usdcShareOFTAdapter = new MockOFTAdapter(
            address(usdcVault), // The vault token (shares)
            LZ_ENDPOINT_V2, // LayerZero endpoint
            deployer // Owner
        );

        ethShareOFTAdapter = new MockOFTAdapter(
            address(ethVault), // The vault token (shares)
            LZ_ENDPOINT_V2, // LayerZero endpoint
            deployer // Owner
        );

        // Deploy VaultComposerSyncPool contracts
        usdcComposer = new VaultComposerSync(
            address(usdcVault), // VAULT
            address(usdcPool), // ASSET_OFT (Stargate Pool)
            address(usdcShareOFTAdapter) // SHARE_OFT
        );

        ethComposer = new VaultComposerSyncNative(
            address(ethVault), // VAULT
            address(ethPool), // ASSET_OFT (Stargate Pool)
            address(ethShareOFTAdapter) // SHARE_OFT
        );

        vm.stopPrank();

        // Setup labels for better debugging
        vm.label(USDC_POOL, "USDCPool");
        vm.label(ETH_POOL, "ETHPool");
        vm.label(USDC_VAULT, "USDCVault");
        vm.label(ETH_VAULT, "ETHVault");
        vm.label(LZ_ENDPOINT_V2, "LZEndpointV2");
        vm.label(address(usdcShareOFTAdapter), "USDCShareOFTAdapter");
        vm.label(address(ethShareOFTAdapter), "ETHShareOFTAdapter");
        vm.label(address(usdcComposer), "USDCComposer");
        vm.label(address(ethComposer), "ETHComposer");

        vm.label(userA, "UserA");
        vm.label(userB, "UserB");
        vm.label(executor, "Executor");
        vm.label(deployer, "Deployer");

        // Give users some ETH for gas and operations
        vm.deal(userA, INITIAL_BALANCE);
        vm.deal(userB, INITIAL_BALANCE);
        vm.deal(executor, INITIAL_BALANCE);
        vm.deal(deployer, INITIAL_BALANCE);
        vm.deal(LZ_ENDPOINT_V2, type(uint64).max);

        // Setup USDC minting capability for tests
        vm.prank(0xE982615d461DD5cD06575BbeA87624fda4e3de17); // USDC Master Minter
        IUSDC(usdcToken).configureMinter(address(this), type(uint256).max);

        randomGUID = bytes32(vm.randomBytes(32));

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](2);
        enforcedOptions[0] = EnforcedOptionParam({ eid: BERA_EID, msgType: 1, options: OPTIONS_LZRECEIVE_100k });
        enforcedOptions[1] = EnforcedOptionParam({ eid: ARB_EID, msgType: 1, options: OPTIONS_LZRECEIVE_100k });
        bytes32 remotePeer = bytes32(vm.randomBytes(32));

        vm.startPrank(deployer);
        usdcShareOFTAdapter.setPeer(BERA_EID, remotePeer);
        usdcShareOFTAdapter.setPeer(ARB_EID, remotePeer);
        ethShareOFTAdapter.setPeer(BERA_EID, remotePeer);
        ethShareOFTAdapter.setPeer(ARB_EID, remotePeer);

        usdcShareOFTAdapter.setEnforcedOptions(enforcedOptions);
        ethShareOFTAdapter.setEnforcedOptions(enforcedOptions);
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Create compose payload for Pool-based operations
     * @param _srcEid Source endpoint ID
     * @param _sendParam Send parameters for the operation
     * @param _minMsgValue Minimum message value required
     * @param _amount Amount being processed
     * @param _msgSender Original message sender
     */
    function _createPoolComposePayload(
        uint32 _srcEid,
        SendParam memory _sendParam,
        uint256 _minMsgValue,
        uint256 _amount,
        address _msgSender
    ) internal pure returns (bytes memory composeMsg) {
        composeMsg = OFTComposeMsgCodec.encode(
            0,
            _srcEid,
            _amount,
            abi.encodePacked(_msgSender.addressToBytes32(), abi.encode(_sendParam, _minMsgValue))
        );
    }

    /**
     * @dev Create a basic SendParam for testing
     * @param _dstEid Destination endpoint ID
     * @param _to Recipient address
     * @param _amount Amount to send
     * @param _minAmount Minimum amount (slippage protection)
     */
    function _createSendParam(
        uint32 _dstEid,
        address _to,
        uint256 _amount,
        uint256 _minAmount
    ) internal pure returns (SendParam memory) {
        return
            SendParam({
                dstEid: _dstEid,
                to: _to.addressToBytes32(),
                amountLD: _amount,
                minAmountLD: _minAmount,
                extraOptions: "",
                composeMsg: "",
                oftCmd: ""
            });
    }

    /**
     * @dev Get path credit for a Stargate Pool destination
     * @param _pool The Stargate Pool
     * @param _dstEid Destination endpoint ID
     */
    function _getPathCredit(StargatePool _pool, uint32 _dstEid) internal view returns (uint64) {
        return _pool.paths(_dstEid);
    }

    /**
     * @dev Check if a path is an OFT path (unlimited credit)
     * @param _pool The Stargate Pool
     * @param _dstEid Destination endpoint ID
     */
    function _isOFTPath(StargatePool _pool, uint32 _dstEid) internal view returns (bool) {
        return _pool.paths(_dstEid) == UNLIMITED_CREDIT;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ASSERTION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function assertEq(SendParam memory _term1, SendParam memory _term2) internal pure {
        assertEq(_term1.dstEid, _term2.dstEid, "dstEid should be equal");
        assertEq(_term1.to, _term2.to, "to should be equal");
        assertEq(_term1.amountLD, _term2.amountLD, "amountLD should be equal");
        assertEq(_term1.minAmountLD, _term2.minAmountLD, "minAmountLD should be equal");
        assertEq(_term1.extraOptions, _term2.extraOptions, "extraOptions should be equal");
    }

    receive() external payable {}
}
