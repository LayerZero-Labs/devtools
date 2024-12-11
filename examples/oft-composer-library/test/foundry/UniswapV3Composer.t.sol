// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Import necessary testing libraries and contracts
import "forge-std/Test.sol";
import { UniswapV3Composer } from "../../contracts/UniswapV3Composer.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

// Mock imports
import { OFTMock } from "../mocks/OFTMock.sol";
import { ERC20Mock } from "../mocks/ERC20Mock.sol";
import { SwapRouterMock } from "../mocks/SwapRouterMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";

// OpenZeppelin imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

/**
 * @title UniswapV3ComposerTest
 * @notice Unit tests for the UniswapV3Composer contract.
 * @dev Utilizes Forge's testing framework to simulate interactions and verify contract behavior.
 */
contract UniswapV3ComposerTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    // ----------------------------
    // ============ Setup ===========
    // ----------------------------

    // Endpoint Identifiers
    uint32 private constant aEid = 1;
    uint32 private constant bEid = 2;

    // Mock Contracts
    OFTMock private aOFT;
    OFTMock private bOFT;
    UniswapV3Composer private bComposer;
    SwapRouterMock private bSwapRouter;

    // ERC20 Tokens
    address bTokenIn;
    ERC20Mock private bTokenOut;

    // User Addresses
    address private userA = makeAddr("userA");
    address private userB = makeAddr("userB");
    address private otherOFTB = makeAddr("otherOFTB");
    address private receiver = makeAddr("receiver");

    // Initial Balances and Swap Amounts
    uint256 private constant initialBalance = 100 ether;
    uint256 private constant swapAmountIn = 1 ether;
    uint256 private constant swapAmountOut = 1 ether; // Predefined output for SwapRouterMock

    // Events
    event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    /**
     * @notice Sets up the testing environment before each test.
     *
     * @dev Deploys mock contracts, initializes token balances, and configures the UniswapV3Composer.
     */
    function setUp() public virtual override {
        // Allocate Ether to users
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        // Initialize endpoints
        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        // Deploy mock ERC20 TokenOut and TokenIn
        bTokenOut = new ERC20Mock("TokenOut", "OUT");

        // Deploy mock OFTs with corresponding endpoints
        aOFT = OFTMock(
            _deployOApp(type(OFTMock).creationCode, abi.encode("aOFT", "aOFT", address(endpoints[aEid]), address(this)))
        );

        bOFT = OFTMock(
            _deployOApp(type(OFTMock).creationCode, abi.encode("bOFT", "bOFT", address(endpoints[bEid]), address(this)))
        );

        // Every OFT variant has token() to distinguish between OFT Adapter and OFT
        bTokenIn = address(bOFT.token());

        // Deploy mock SwapRouter with correct tokenIn and tokenOut addresses
        bSwapRouter = new SwapRouterMock(address(bTokenIn), address(bTokenOut), swapAmountOut);

        // Deploy the UniswapV3Composer contract with initialized SwapRouter and OFT
        bComposer = new UniswapV3Composer(address(bSwapRouter), address(endpoints[bEid]), address(bOFT));

        // Configure and link the deployed OFTs
        address[] memory ofts = new address[](2);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        this.wireOApps(ofts);

        // Mint initial tokens to users and contracts
        aOFT.mint(userA, initialBalance);
        bOFT.mint(userB, initialBalance);
        bOFT.mint(address(bComposer), initialBalance);
        // Note: SwapRouterMock handles minting TokenOut during swap execution
    }

    // ----------------------------
    // ========= Constructor =======
    // ----------------------------

    /**
     * @notice Tests the constructor of UniswapV3Composer for correct initialization.
     * @dev Verifies that SwapRouter, endpoint, and OFT addresses are set as expected.
     */
    function test_constructor() public {
        // Assert that the SwapRouter address is correctly set in UniswapV3Composer
        assertEq(address(bComposer.swapRouter()), address(bSwapRouter), "SwapRouter address mismatch");

        // Assert that the endpoint address is correctly set in UniswapV3Composer
        assertEq(bComposer.endpoint(), address(endpoints[bEid]), "Endpoint address mismatch");

        // Assert that the OFT address is correctly set in UniswapV3Composer
        assertEq(bComposer.oft(), address(bOFT), "OFT address mismatch");
    }

    // ----------------------------
    // ========= Test Cases =======
    // ----------------------------

    /**
     * @notice Tests the `lzCompose` function to ensure it correctly handles incoming messages and executes swaps.
     * @dev Simulates sending a compose message via LayerZero and verifies SwapRouterMock interactions and token balances.
     */
    function test_lzCompose() public {
        // ------------------------------
        // 1. Prepare the Compose Message
        // ------------------------------
        uint24 fee = 3000; // Example fee tier

        // Encode the compose message with (userA, bTokenOut, fee, receiver)
        bytes memory composeMsg = abi.encode(userA, address(bTokenOut), fee, receiver);

        // Encode the full message using OFTComposeMsgCodec
        // Parameters:
        // _nonce: 1 (unique identifier)
        // _srcEid: aEid (source endpoint ID)
        // _amountLD: swapAmountIn (amount to be swapped)
        // _composeMsg: composeMsg (encoded compose message)
        bytes memory fullMessage = OFTComposeMsgCodec.encode(
            1,
            aEid,
            swapAmountIn,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );

        // ------------------------------
        // 2. Simulate Sending the Message
        // ------------------------------
        // Prank as the authorized endpoint to call lzCompose
        vm.prank(address(endpoints[bEid]));

        // Execute lzCompose with the encoded full message
        bComposer.lzCompose(
            address(bOFT),
            bytes32(0), // guid (unused in this test)
            fullMessage,
            address(this), // executor
            bytes("") // extraData (unused in this test)
        );

        // ------------------------------
        // 3. Verify SwapRouterMock Interactions
        // ------------------------------
        assertEq(bSwapRouter.lastSender(), address(bComposer), "SwapRouter sender mismatch");
        assertEq(bSwapRouter.lastTokenIn(), address(bTokenIn), "TokenIn address mismatch");
        assertEq(bSwapRouter.lastTokenOut(), address(bTokenOut), "TokenOut address mismatch");
        assertEq(bSwapRouter.lastFee(), fee, "Fee tier mismatch");
        assertEq(bSwapRouter.lastRecipient(), receiver, "Recipient address mismatch");
        assertEq(bSwapRouter.lastAmountIn(), swapAmountIn, "AmountIn mismatch");
        assertEq(bSwapRouter.lastAmountOut(), swapAmountOut, "AmountOut mismatch");

        // ------------------------------
        // 4. Verify Token Balances After Swap
        // ------------------------------
        // Verify that bComposer's tokenIn balance decreased by swapAmountIn
        assertEq(
            IERC20(bOFT.token()).balanceOf(address(bComposer)),
            initialBalance - swapAmountIn,
            "bComposer TokenIn balance incorrect"
        );

        // Verify that the receiver's tokenOut balance increased by swapAmountOut
        assertEq(bTokenOut.balanceOf(receiver), swapAmountOut, "Receiver TokenOut balance incorrect");
    }

    /**
     * @notice Tests that `lzCompose` reverts when called with an unauthorized OFT.
     * @dev Attempts to invoke `lzCompose` with a different OFT address and expects a revert.
     */
    function test_lzCompose_UnauthorizedOFT() public {
        // ------------------------------
        // 1. Prepare the Unauthorized Compose Message
        // ------------------------------
        uint24 fee = 3000; // Example fee tier

        // Encode the compose message with (userA, bTokenOut, fee, receiver)
        bytes memory composeMsg = abi.encode(userA, address(bTokenOut), fee, receiver);

        // Encode the full message using OFTComposeMsgCodec
        bytes memory fullMessage = OFTComposeMsgCodec.encode(
            1, // _nonce
            aEid, // _srcEid
            swapAmountIn, // _amountLD
            composeMsg // _composeMsg
        );

        // ------------------------------
        // 2. Attempt Unauthorized lzCompose
        // ------------------------------
        // Prank as the authorized endpoint to call lzCompose
        vm.prank(address(endpoints[bEid]));

        // Expect the transaction to revert with "Unauthorized OFT"
        vm.expectRevert("Unauthorized OFT");

        // Attempt to execute lzCompose with an unauthorized OFT address
        bComposer.lzCompose(
            address(otherOFTB),
            bytes32(0), // guid (unused in this test)
            fullMessage,
            address(0), // executor
            bytes("") // extraData (unused in this test)
        );
    }
}
