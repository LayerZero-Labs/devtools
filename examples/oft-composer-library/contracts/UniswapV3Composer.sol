// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import necessary interfaces and libraries
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";

import { IUniswapV3Composer } from "./IUniswapV3Composer.sol";

/**
 * @title UniswapV3Composer
 *
 * @notice Handles cross-chain OFT token swaps using Uniswap V3 upon receiving tokens via LayerZero.
 *
 * @dev This contract inherits from IOAppComposer and interacts with Uniswap V3's SwapRouter to execute token swaps.
 */
contract UniswapV3Composer is IOAppComposer, IUniswapV3Composer {
    using SafeERC20 for IERC20;
    /// @notice The Uniswap V3 SwapRouter used to perform token swaps.
    ISwapRouter public immutable SWAP_ROUTER;

    /// @notice The address of the OFT on the receiving chain.
    address public immutable OFT;

    /// @notice The LayerZero Endpoint address for cross-chain communication.
    address public immutable ENDPOINT;

    /// @notice The address of the token being swapped from (OFT).
    address public immutable TOKEN_IN;

    /**
     * @notice Initializes the UniswapV3Composer contract with necessary parameters.
     *
     * @param _swapRouter The address of the Uniswap V3 SwapRouter.
     * @param _oft The address of the originating OFT that sends composed messages.
     *
     * Requirements:
     *
     * - `_swapRouter` cannot be the zero address.
     * - `_oft` cannot be the zero address.
     */
    constructor(address _swapRouter, address _oft) {
        if (_swapRouter == address(0)) revert InvalidSwapRouter();
        if (_oft == address(0)) revert InvalidOFT();

        // Get the LayerZero Endpoint address from the OFT.
        ENDPOINT = address(IOAppCore(_oft).endpoint());

        // Initialize the swap router and OFT addresses.
        SWAP_ROUTER = ISwapRouter(_swapRouter);
        OFT = _oft;
        TOKEN_IN = IOFT(OFT).token();

        // Max approve the SwapRouter to spend TOKEN_IN to save gas on every compose transaction.
        // This is safe since tokens can only enter this contract from the trusted LayerZero Endpoint
        // via the trusted OFT, and the SwapRouter can only spend tokens the contract actually holds.
        IERC20(TOKEN_IN).approve(address(SWAP_ROUTER), type(uint256).max);
    }

    /**
     * @notice Handles incoming composed messages from LayerZero to execute token swaps on Uniswap V3.
     *
     * @param _oft The address of the originating OFT.
     * @param _message The encoded message content in the format of OFTComposeMsgCodec.
     *
     * @dev _executor The address of the executor (unused in this context).
     * @dev _guid The globally unique identifier of the message (unused in this context).
     * @dev _executorData Additional data for the executor (unused in this context).
     *
     * This function decodes the incoming message to extract swap parameters and executes the token swap
     * using Uniswap V3. It ensures that only the authorized OFT and the LayerZero Endpoint can invoke this function.
     *
     * Emits a {SwapExecuted} event upon successful execution of the swap.
     *
     * Transfers the OFT tokens directly to the recipient if the swap fails.
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
        if (_oft != OFT) revert UnauthorizedOFT();
        if (msg.sender != ENDPOINT) revert UnauthorizedEndpoint();

        (address tokenOut, uint24 fee, address recipient, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) = abi
            .decode(OFTComposeMsgCodec.composeMsg(_message), (address, uint24, address, uint256, uint160));

        // Extract the original msg.sender of OFT.send() on the source chain.
        bytes32 srcSender = OFTComposeMsgCodec.composeFrom(_message);
        // Decode the amountIn from the message amount received.
        uint256 amountIn = OFTComposeMsgCodec.amountLD(_message);

        // Set up Uniswap V3 swap parameters.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: TOKEN_IN,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp + 300, // 5 minutes deadline for example.
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });

        // Attempt to execute the swap on Uniswap V3.
        try SWAP_ROUTER.exactInputSingle(params) returns (uint256 amountOut) {
            emit SwapExecuted(srcSender, recipient, TOKEN_IN, tokenOut, amountIn, amountOut);
        } catch {
            // Refund the OFT tokens to the recipient if the swap fails.
            IERC20(TOKEN_IN).safeTransfer(recipient, amountIn);
            emit SwapFailedAndRefunded(srcSender, TOKEN_IN, recipient, amountIn);
        }
    }
}
