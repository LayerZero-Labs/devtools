// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import necessary interfaces and libraries
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

/**
 * @title UniswapV3Composer
 *
 * @notice Handles cross-chain OFT token swaps using Uniswap V3 upon receiving tokens via LayerZero.
 *
 * @dev This contract inherits from IOAppComposer and interacts with Uniswap V3's SwapRouter to execute token swaps.
 */
contract UniswapV3Composer is IOAppComposer {
    using SafeERC20 for IERC20;

    /// @notice The Uniswap V3 SwapRouter used to perform token swaps.
    ISwapRouter public immutable swapRouter;

    /// @notice The LayerZero Endpoint address for cross-chain communication.
    address public immutable endpoint;

    /// @notice The address of the OFT on the receiving chain.
    address public immutable oft;

    /// @notice Emitted when a token swap is successfully executed.
    /// @param user The address of the user initiating the swap.
    /// @param tokenIn The address of the ERC20 token being swapped from (OFT).
    /// @param tokenOut The address of the ERC20 token being swapped to.
    /// @param amountIn The amount of `tokenIn` being swapped.
    /// @param amountOut The amount of `tokenOut` received from the swap.
    event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    /**
     * @notice Initializes the UniswapV3Composer contract with necessary parameters.
     * @param _swapRouter The address of the Uniswap V3 SwapRouter.
     * @param _endpoint The LayerZero Endpoint address for cross-chain communication.
     * @param _oft The address of the originating OFT that sends composed messages.
     *
     * Requirements:
     *
     * - `_swapRouter` cannot be the zero address.
     * - `_endpoint` cannot be the zero address.
     * - `_oft` cannot be the zero address.
     */
    constructor(address _swapRouter, address _endpoint, address _oft) {
        require(_swapRouter != address(0), "Invalid SwapRouter address");
        require(_endpoint != address(0), "Invalid Endpoint address");
        require(_oft != address(0), "Invalid OFT address");

        swapRouter = ISwapRouter(_swapRouter);
        endpoint = _endpoint;
        oft = _oft;
    }

    /**
     * @notice Handles incoming composed messages from LayerZero to execute token swaps on Uniswap V3.
     *
     * @param _oft The address of the originating OFT.
     * @param _message The encoded message content in the format of OFTComposeMsgCodec.
     * @dev _executor The address of the executor (unused in this context).
     * @dev _guid The globally unique identifier of the message (unused in this context).
     * @dev _executorData Additional data for the executor (unused in this context).
     * @dev
     * This function decodes the incoming message to extract swap parameters and executes the token swap using Uniswap V3.
     * It ensures that only the authorized OFT and the LayerZero Endpoint can invoke this function.
     *
     * Emits a {SwapExecuted} event upon successful execution of the swap.
     *
     * Requirements:
     *
     * - `_oft` must match the authorized OFT address.
     * - The caller must be the authorized LayerZero Endpoint.
     *
     * Reverts if any of the above conditions are not met.
     */
    function lzCompose(
        address _oft,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        require(_oft == address(oft), "Unauthorized OFT");
        require(msg.sender == endpoint, "Unauthorized Endpoint");

        // Decode the composed message using OFTComposeMsgCodec
        (address user, address tokenOut, uint24 fee, address recipient) = abi.decode(
            OFTComposeMsgCodec.composeMsg(_message),
            (address, address, uint24, address)
        );

        // Decode the amountIn from the message amount received
        uint256 amountIn = OFTComposeMsgCodec.amountLD(_message);

        // Reference to the ERC20 token used by the OFT
        address tokenIn = IOFT(oft).token();

        // Approve the SwapRouter to spend tokenIn
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Set up Uniswap V3 swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp + 300, // 5 minutes deadline
            amountIn: amountIn,
            amountOutMinimum: 0, // Consider setting a minimum amount out to protect against slippage
            sqrtPriceLimitX96: 0 // No price limit
        });

        // Execute the swap on Uniswap V3
        uint256 amountOut = swapRouter.exactInputSingle(params);

        // Emit an event to log the swap details
        emit SwapExecuted(user, tokenIn, tokenOut, amountIn, amountOut);
    }
}
