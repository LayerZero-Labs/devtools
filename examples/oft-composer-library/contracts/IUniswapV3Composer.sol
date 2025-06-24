// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IUniswapV3Composer
 *
 * @notice Interface defining events and errors for the UniswapV3Composer contract.
 *
 * @dev This interface helps with code organization, testing, and reusability by separating
 * contract definitions from implementation logic.
 */
interface IUniswapV3Composer {
    /// @notice Custom errors for more gas-efficient reverts.
    error InvalidSwapRouter();
    error InvalidEndpoint();
    error InvalidOFT();
    error UnauthorizedOFT();
    error UnauthorizedEndpoint();

    /**
     * @notice Emitted when a token swap is successfully executed.
     *
     * @param srcSender The bytes32 address of the user initiating the swap on the source chain.
     * @param recipient The address of the recipient of the swapped tokens.
     * @param tokenIn The address of the ERC20 token being swapped from (OFT).
     * @param tokenOut The address of the ERC20 token being swapped to.
     * @param amountIn The amount of `tokenIn` being swapped.
     * @param amountOut The amount of `tokenOut` received from the swap.
     */
    event SwapExecuted(
        bytes32 indexed srcSender,
        address recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @notice Emitted when a token swap fails and the OFT tokens are refunded to the recipient.
     *
     * @param srcSender The bytes32 address of the user initiating the swap on the source chain.
     * @param tokenIn The address of the ERC20 token being swapped from (OFT).
     * @param recipient The address of the recipient of the OFT tokens.
     * @param amountIn The amount of `tokenIn` being refunded.
     */
    event SwapFailedAndRefunded(bytes32 indexed srcSender, address tokenIn, address recipient, uint256 amountIn);
}
