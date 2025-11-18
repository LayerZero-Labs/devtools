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

import { IUniswapV3Composer } from "./interfaces/IUniswapV3Composer.sol";

/**
 * @title UniswapV3Composer
 *
 * @notice Handles cross-chain token swaps using Uniswap V3 upon receiving tokens via LayerZero.
 *
 * @dev This contract inherits from IOAppComposer and interacts with Uniswap V3's SwapRouter to execute token swaps.
 *      It is an **educational example** that accompanies the LayerZero V2 docs on Omnichain Composers.
 *      See:
 *        • https://docs.layerzero.network/v2/developers/evm/composer/overview
 *        • https://docs.layerzero.network/v2/developers/evm/oft/quickstart#send-tokens--call-composer
 *
 *      The code is annotated with numbered section dividers to clearly separate:
 *        0. Setup & Constructor logic
 *        1. Receive business logic (`lzCompose`)
 *
 *      Feel free to replace the Uniswap swap with your own custom business logic in Step 4.
 *      The overarching pattern (authenticate → decode → act → emit/cleanup) remains the same.
 */
contract UniswapV3Composer is IOAppComposer, IUniswapV3Composer {
    using SafeERC20 for IERC20;
    /// @notice The Uniswap V3 SwapRouter used to perform token swaps.
    /// @dev Must expose the `exactInputSingle` method from the Uniswap V3 Periphery.
    ISwapRouter public immutable SWAP_ROUTER;

    /// @notice The trusted Omnichain Fungible Token (OFT) that can trigger `lzCompose` on this contract.
    address public immutable OFT;

    /// @notice LayerZero Endpoint V2 used by the trusted OFT on this chain.
    address public immutable ENDPOINT;

    /// @notice ERC20 token address that backs the trusted OFT (`tokenIn` for every swap).
    address public immutable TOKEN_IN;

    // ──────────────────────────────────────────────────────────────────────────────
    // 0. Setup & Constructor
    //    • Validates inputs
    //    • Caches Endpoint / Router / Token addresses
    //    • Grants a one-time max approval to the Uniswap V3 router
    //
    //  ↳  Docs: https://docs.layerzero.network/v2/developers/evm/composer/overview
    //           https://docs.layerzero.network/v2/developers/evm/oft/quickstart#send-tokens--call-composer
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploys the composer and connects it to a trusted OFT and Uniswap V3 router.
     *
     * @dev  The constructor assumes that `_oft` is already configured with the correct
     *       LayerZero Endpoint. It queries the endpoint from the OFT so the composer
     *       does not need a redundant constructor param.
     *
     *       A **one-time `maxApprove`** is granted to the router because:
     *         1. Funds only arrive via `lzReceive` → `lzCompose` from the trusted OFT.
     *         2. The router can only transfer what the composeMsg allows.
     *         3. Saves ~5k gas on every compose execution.
     *
     * @param _swapRouter Address of the Uniswap V3 `SwapRouter`.
     * @param _oft        Address of the trusted OFT that will source composed messages.
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

        // -----------------------------------------------------------------------------
        // Grant an unlimited allowance ("maxApprove") to the Uniswap V3 router.
        //
        // Safety rationale:
        //   1. `SWAP_ROUTER` can only `transferFrom` *this contract* (msg.sender).
        //   2. This composer calls `exactInputSingle` **only** after a successful
        //      `lzCompose`, and for the _exact_ `amountIn` of tokens delivered with
        //      that message (decoded via `OFTComposeMsgCodec.amountLD`).
        //   3. If the swap execution reverts we refund the tokens; if the entire
        //      transaction runs out of gas the tokens simply remain in the composer
        //      and are never at risk because the router was never invoked.
        //
        // Therefore an unlimited approval is safe and saves gas compared to
        // approving per message.
        IERC20(TOKEN_IN).approve(address(SWAP_ROUTER), type(uint256).max);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // 1. Receive Business Logic (`lzCompose`)
    //    Called by the LayerZero Endpoint after a user sends OFT tokens cross-chain
    //    with a compose message. Decodes the message and performs a Uniswap V3 swap
    //    on behalf of the original sender.
    //
    //    Steps:
    //      1. Authenticity checks (trusted OFT & Endpoint)
    //      2. Decode swap parameters & source sender from `_message`
    //      3. Build `ExactInputSingleParams` struct
    //      4. Try to execute swap → emit `SwapExecuted`
    //         • On failure, refund tokens → emit `SwapFailedAndRefunded`
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Consumes a composed message and swaps `TOKEN_IN` → `tokenOut` on Uniswap V3.
     *
     * @dev  `_message` is encoded by the OFT.send() caller on the source chain via
     *       `OFTComposeMsgCodec.encode()` and has the following layout:
     *
     *       ```
     *       | srcNonce (uint64) | srcEid (uint32) | amountLD (uint128) |
     *       | composeFrom (bytes32) | composeMsg (bytes) |
     *       ```
     *
     *       `composeMsg` (last field) is expected to be:
     *       `abi.encode(tokenOut, fee, recipient, amountOutMin, sqrtPriceLimitX96)`.
     *
     *       - Authentication: ensure caller is the **trusted Endpoint** and `_oft` matches.
     *       - Safety: on swap failure, funds are **refunded** (no token losses).
     *
     * @param _oft     The originating OFT address (must equal `OFT`).
     * @dev _guid    Message hash (unused, but kept for future extensibility).
     * @param _message ABI-encoded compose message described above.
     * @dev _executor Executor that relayed the message (unused).
     * @dev _extraData Extra data from executor (unused).
     */
    function lzCompose(
        address _oft,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        // Step 1️: Authenticate call logic source.
        if (_oft != OFT) revert UnauthorizedOFT();
        if (msg.sender != ENDPOINT) revert UnauthorizedEndpoint();

        // Step 2️: Decode the swap parameters & sender from the compose message included in the OFT.send() call.
        (address tokenOut, uint24 fee, address recipient, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) = abi
            .decode(OFTComposeMsgCodec.composeMsg(_message), (address, uint24, address, uint256, uint160));

        //  • Extract the original msg.sender of `OFT.send()` on the source chain.
        bytes32 srcSender = OFTComposeMsgCodec.composeFrom(_message);
        //  • Decode the amount (local decimals) sent with the compose message.
        uint256 amountIn = OFTComposeMsgCodec.amountLD(_message);

        // Step 3️: Build Uniswap V3 swap parameters.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: TOKEN_IN,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp + 300, // 5-minute deadline for example purposes.
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });

        // Step 4️: Execute the swap or refund to target recipient.
        try SWAP_ROUTER.exactInputSingle(params) returns (uint256 amountOut) {
            emit SwapExecuted(srcSender, recipient, TOKEN_IN, tokenOut, amountIn, amountOut);
        } catch {
            // If the swap fails, refund the exact amount to the recipient so that funds are not stuck in the composer.
            IERC20(TOKEN_IN).safeTransfer(recipient, amountIn);
            emit SwapFailedAndRefunded(srcSender, TOKEN_IN, recipient, amountIn);
        }
    }
}
