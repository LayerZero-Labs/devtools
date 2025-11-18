// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Testing libraries
import "forge-std/Test.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

// Composer contracts
import { AaveV3Composer } from "../../contracts/AaveV3Composer.sol";
import { IAaveV3Composer } from "../../contracts/interfaces/IAaveV3Composer.sol";

// LayerZero helpers
import { OFTComposeMsgCodec } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTComposeMsgCodec.sol";

// Mock dependencies
import { ERC20Mock } from "../mocks/ERC20Mock.sol";
import { AaveV3PoolMock } from "../mocks/AaveV3PoolMock.sol";
import { StargatePoolMock } from "../mocks/StargatePoolMock.sol";

// OpenZeppelin interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AaveV3ComposerTest
 * @notice Unit tests for the `AaveV3Composer` contract.
 */
contract AaveV3ComposerTest is TestHelperOz5, IAaveV3Composer {
    // ----------------------------
    // ============ Setup ===========
    // ----------------------------

    // Endpoint identifiers
    uint32 private constant aEid = 1;
    uint32 private constant bEid = 2;

    // Token balances
    uint256 private constant initialBalance = 100 ether;
    uint256 private constant amountLD = 1 ether;

    // Mock contracts
    ERC20Mock private token;
    AaveV3PoolMock private aave;
    StargatePoolMock private stargate;
    AaveV3Composer private composer;

    // User addresses
    address private userA;
    address private receiver;

    /**
     * @notice Sets up the testing environment before each test.
     * @dev Deploys mocks, configures endpoints, and seeds initial token balances.
     */
    function setUp() public override {
        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);
        token = new ERC20Mock("TokenIn", "TIN");
        stargate = new StargatePoolMock(address(endpoints[bEid]), address(token));
        aave = new AaveV3PoolMock(address(token));
        composer = new AaveV3Composer(address(aave), address(stargate));
        token.mint(address(composer), initialBalance);
        userA = makeAddr("userA");
        receiver = makeAddr("receiver");
    }

    // ----------------------------
    // ========= Constructor =======
    // ----------------------------

    /**
     * @notice Verifies the constructor initializes contract state correctly.
     * @dev Asserts dependencies, endpoints, and allowances are configured as expected.
     */
    function test_constructor() public view {
        assertEq(address(composer.AAVE()), address(aave));
        assertEq(composer.ENDPOINT(), address(endpoints[bEid]));
        assertEq(composer.STARGATE(), address(stargate));
        assertEq(composer.TOKEN_IN(), address(token));
        assertEq(IERC20(address(token)).allowance(address(composer), address(aave)), type(uint256).max);
    }

    // ----------------------------
    // ========= Test Cases =======
    // ----------------------------

    /**
     * @notice Tests that a successful `lzCompose` call supplies tokens to Aave.
     * @dev Confirms the mock pool receives the correct parameters and token balance updates.
     */
    function test_lzCompose_supply_emitsEventsAndSupplies() public {
        bytes memory fullMessage = _buildMessageForReceiver(receiver);

        vm.expectEmit(true, false, false, true);
        emit Supplied(receiver, amountLD);
        vm.expectEmit(false, false, false, true);
        emit Sent(bytes32(0));

        vm.prank(address(endpoints[bEid]));
        composer.lzCompose(address(stargate), bytes32(0), fullMessage, address(0), bytes(""));

        assertEq(aave.lastAsset(), address(token));
        assertEq(aave.lastAmount(), amountLD);
        assertEq(aave.lastOnBehalfOf(), receiver);
        assertEq(aave.tokenBalance(), amountLD);
        assertEq(token.balanceOf(address(composer)), initialBalance - amountLD);
        assertEq(stargate.refundCallCount(), 0);
    }

    /**
     * @notice Tests the fallback path when the Aave pool reverts.
     * @dev Ensures the composer transfers tokens directly to the receiver on failure.
     */
    function test_lzCompose_supplyFailureRefundsAndEmits() public {
        aave.setShouldRevert(true);

        bytes memory fullMessage = _buildMessageForReceiver(receiver);
        address originUser = makeAddr("originUser");

        vm.expectEmit(true, false, false, true);
        emit SupplyFailedAndRefunded(receiver, amountLD);
        vm.expectEmit(false, false, false, true);
        emit Sent(bytes32(0));

        vm.startPrank(address(endpoints[bEid]), originUser);
        composer.lzCompose(address(stargate), bytes32(0), fullMessage, address(0), bytes(""));
        vm.stopPrank();

        assertEq(aave.tokenBalance(), 0);
        assertEq(stargate.refundCallCount(), 1);
        assertEq(stargate.lastRefundDstEid(), aEid);
        assertEq(stargate.lastRefundTo(), addressToBytes32(userA));
        assertEq(stargate.lastRefundAmount(), amountLD);
        assertEq(stargate.lastRefundAddress(), originUser);
    }

    function test_lzCompose_handleComposeRevertEmitsRefunded() public {
        bytes memory invalidComposeMsg = new bytes(0);
        bytes memory fullMessage = OFTComposeMsgCodec.encode(
            1,
            aEid,
            amountLD,
            abi.encodePacked(addressToBytes32(userA), invalidComposeMsg)
        );

        vm.expectEmit(false, false, false, true);
        emit Refunded(bytes32(0));

        vm.prank(address(endpoints[bEid]));
        composer.lzCompose(address(stargate), bytes32(0), fullMessage, address(0), bytes(""));

        assertEq(stargate.refundCallCount(), 1);
        assertEq(stargate.lastRefundDstEid(), aEid);
        assertEq(stargate.lastRefundTo(), addressToBytes32(userA));
        assertEq(stargate.lastRefundAmount(), amountLD);
    }

    /**
     * @notice Tests `lzCompose` reverts when called by an unauthorized Stargate pool.
     * @dev Expects the `UnauthorizedStargatePool` error from `IAaveV3Composer`.
     */
    function test_lzCompose_unauthorizedStargate() public {
        bytes memory fullMessage = _buildMessageForReceiver(receiver);
        vm.startPrank(address(endpoints[bEid]));
        vm.expectRevert(
            abi.encodeWithSelector(IAaveV3Composer.OnlyValidComposerCaller.selector, address(0x1234))
        );
        composer.lzCompose(address(0x1234), bytes32(0), fullMessage, address(0), bytes(""));
        vm.stopPrank();
    }

    /**
     * @notice Tests `lzCompose` reverts when invoked from an unauthorized endpoint.
     * @dev Expects the `UnauthorizedEndpoint` error from `IAaveV3Composer`.
     */
    function test_lzCompose_unauthorizedEndpoint() public {
        bytes memory fullMessage = _buildMessageForReceiver(receiver);
        vm.expectRevert(abi.encodeWithSelector(IAaveV3Composer.OnlyEndpoint.selector, address(this)));
        composer.lzCompose(address(stargate), bytes32(0), fullMessage, address(0), bytes(""));
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _buildMessageForReceiver(address _receiver) internal view returns (bytes memory) {
        bytes memory composeMsg = abi.encode(_receiver);
        return
            OFTComposeMsgCodec.encode(
                1,
                aEid,
                amountLD,
                abi.encodePacked(addressToBytes32(userA), composeMsg)
            );
    }
}
