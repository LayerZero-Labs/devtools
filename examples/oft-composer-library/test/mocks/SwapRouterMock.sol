// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import the ISwapRouter interface from Uniswap V3 Periphery
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20Mock } from "../mocks/ERC20Mock.sol";

/**
 * @title SwapRouterMock
 * @notice A mock implementation of Uniswap V3's ISwapRouter for testing purposes.
 * @dev This contract records the parameters of the last swap and returns a predefined amountOut.
 */
contract SwapRouterMock is ISwapRouter {
    // State variables to record the parameters of the last swap
    address public lastSender;
    address public lastTokenIn;
    address public lastTokenOut;
    uint24 public lastFee;
    address public lastRecipient;
    uint256 public lastAmountIn;
    uint256 public lastAmountOut;

    // ERC20 tokens used for swapping
    IERC20 public tokenIn;
    ERC20Mock public tokenOut;

    // Predefined amountOut to return on swaps
    uint256 private predefinedAmountOut;

    // Flag to simulate revert behavior
    bool public shouldRevert;

    /**
     * @notice Initializes the SwapRouterMock with predefined tokens and amountOut.
     * @param _oftIn The OFT address being swapped from.
     * @param _tokenOut The ERC20 token address being swapped to.
     * @param _predefinedAmountOut The amount of tokenOut to return on swaps.
     */
    constructor(address _oftIn, address _tokenOut, uint256 _predefinedAmountOut) {
        tokenIn = IERC20(IOFT(_oftIn).token());
        tokenOut = ERC20Mock(_tokenOut);
        predefinedAmountOut = _predefinedAmountOut;
    }

    /**
     * @notice Allows setting a new predefined amountOut for subsequent swaps.
     * @param _newAmountOut The new amountOut to return.
     */
    function setPredefinedAmountOut(uint256 _newAmountOut) external {
        predefinedAmountOut = _newAmountOut;
    }

    /**
     * @notice Sets whether the swap should revert to simulate failure conditions.
     * @param _shouldRevert If true, the swap will revert.
     */
    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    /**
     * @notice Mocks the exactInputSingle function of Uniswap V3's ISwapRouter.
     * @param params The parameters for the swap, as defined in ISwapRouter.ExactInputSingleParams.
     * @return amountOut The amount of tokenOut received from the swap.
     *
     * @dev This function records the swap parameters and returns a predefined amountOut.
     *      It simulates the token transfer by minting tokenOut to the recipient.
     *      If shouldRevert is true, it reverts to simulate a swap failure.
     */
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable override returns (uint256 amountOut) {
        // Simulate a swap failure if requested.
        if (shouldRevert) {
            revert("SwapRouterMock: swap reverted as requested");
        }

        // Validate amountIn.
        require(params.amountIn > 0, "SwapRouterMock: amountIn must be greater than zero");

        // Record the parameters of the swap.
        lastSender = msg.sender;
        lastTokenIn = params.tokenIn;
        lastTokenOut = params.tokenOut;
        lastFee = params.fee;
        lastRecipient = params.recipient;
        lastAmountIn = params.amountIn;
        lastAmountOut = predefinedAmountOut;

        // Simulate the transfer of tokenIn from the sender to the SwapRouterMock.
        tokenIn.transferFrom(msg.sender, address(this), params.amountIn);

        // Simulate minting tokenOut to the recipient.
        tokenOut.mint(params.recipient, predefinedAmountOut);

        // Return the predefined amountOut.
        return predefinedAmountOut;
    }

    // The following functions are not implemented in this mock and will revert if called.

    function exactInput(
        ISwapRouter.ExactInputParams calldata /*params*/
    ) external payable override returns (uint256 /*amountOut*/) {
        revert("SwapRouterMock: exactInput not implemented");
    }

    function exactOutputSingle(
        ISwapRouter.ExactOutputSingleParams calldata /*params*/
    ) external payable override returns (uint256 /*amountIn*/) {
        revert("SwapRouterMock: exactOutputSingle not implemented");
    }

    function exactOutput(
        ISwapRouter.ExactOutputParams calldata /*params*/
    ) external payable override returns (uint256 /*amountIn*/) {
        revert("SwapRouterMock: exactOutput not implemented");
    }

    function uniswapV3SwapCallback(
        int256 /*amount0Delta*/,
        int256 /*amount1Delta*/,
        bytes calldata /*data*/
    ) external pure override {
        revert("SwapRouterMock: uniswapV3SwapCallback not implemented");
    }
}
