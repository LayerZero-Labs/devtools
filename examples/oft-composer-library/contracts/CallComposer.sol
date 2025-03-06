// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import necessary interfaces and libraries.
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

/**
 * @title CallComposer
 *
 * @notice A generic composer that executes arbitrary calls using tokens delivered via LayerZero.
 *
 * @dev The composed message is expected to be ABI‐encoded to include:
 *      abi.encode(target, callValue, refundReceiver, callData)
 * where:
 *      - target: address to call (must not be address(0))
 *      - callValue: uint128 amount of ETH to forward (if any)
 *      - refundReceiver: address to which any leftover tokens will be refunded
 *      - callData: arbitrary calldata to execute on the target.
 *
 * In addition, we use OFTComposeMsgCodec to extract:
 *      - srcSender: the original sender on the source chain.
 *      - amount: the token amount delivered from the OFT.
 */
contract CallComposer is IOAppComposer {
    using SafeERC20 for IERC20;

    /// @notice The authorized LayerZero endpoint.
    address public immutable endpoint;
    /// @notice The authorized OFT on the receiving chain.
    address public immutable oft;

    /// @notice Custom errors for more gas–efficient reverts.
    error UnauthorizedOFT();
    error UnauthorizedEndpoint();
    error InvalidTarget();

    /// @notice Emitted when an arbitrary call is successfully executed.
    event CallExecuted(
        bytes32 indexed srcSender,
        address target,
        address token,
        uint256 amount,
        bytes result
    );

    /// @notice Emitted when an arbitrary call fails and the tokens are refunded.
    event CallFailedAndRefunded(
        bytes32 indexed srcSender,
        address token,
        address refundReceiver,
        uint256 amount
    );

    /**
     * @notice Initializes the CallComposer contract.
     * @param _endpoint The LayerZero endpoint address.
     * @param _oft The authorized OFT address.
     *
     * Requirements:
     * - Neither _endpoint nor _oft may be the zero address.
     */
    constructor(address _endpoint, address _oft) {
        if (_endpoint == address(0)) revert UnauthorizedEndpoint();
        if (_oft == address(0)) revert UnauthorizedOFT();
        endpoint = _endpoint;
        oft = _oft;
    }

    /**
     * @notice Handles incoming composed messages from LayerZero to execute arbitrary calls.
     *
     * @param _oft The originating OFT address.
     * @param _message The encoded message containing call parameters.
     * @dev _executor Unused.
     * @dev _extraData Unused.
     *
     * Requirements:
     * - _oft must match the authorized OFT.
     * - The caller must be the authorized LayerZero endpoint.
     *
     * The message (decoded via OFTComposeMsgCodec.composeMsg) is expected to contain:
     *   (address target, uint128 callValue, address refundReceiver, bytes callData)
     *
     * Additionally, the OFTComposeMsgCodec is used to extract:
     *   - srcSender: the original sender on the source chain.
     *   - amount: the token amount delivered via the OFT.
     *
     * On success, emits {CallExecuted}; on failure, refunds tokens and emits {CallFailedAndRefunded}.
     */
    function lzCompose(
        address _oft,
        bytes32, // _guid (unused)
        bytes calldata _message,
        address, // _executor (unused)
        bytes calldata // _extraData (unused)
    ) external payable override {
        if (_oft != oft) revert UnauthorizedOFT();
        if (msg.sender != endpoint) revert UnauthorizedEndpoint();

        // Decode the arbitrary call parameters from the message.
        // The composed message is expected to be: abi.encode(target, callValue, refundReceiver, callData)
        (address target, uint128 callValue, address refundReceiver, bytes memory callData) = abi.decode(
            OFTComposeMsgCodec.composeMsg(_message),
            (address, uint128, address, bytes)
        );
        if (target == address(0)) revert InvalidTarget();

        // Extract additional parameters from the OFT compose message.
        bytes32 srcSender = OFTComposeMsgCodec.composeFrom(_message);
        uint256 amount = OFTComposeMsgCodec.amountLD(_message);
        address token = IOFT(oft).token();

        // Increase the allowance for the target to spend the delivered tokens.
        uint256 currentAllowance = IERC20(token).allowance(address(this), target);
        if (currentAllowance < amount) {
            IERC20(token).safeIncreaseAllowance(target, amount - currentAllowance);
        } else if (currentAllowance > amount) {
            IERC20(token).safeDecreaseAllowance(target, currentAllowance - amount);
        }

        // Execute the arbitrary call.
        (bool success, bytes memory result) = target.call{ value: callValue }(callData);

        // Revoke approval by decreasing any remaining allowance.
        uint256 newAllowance = IERC20(token).allowance(address(this), target);
        if (newAllowance > 0) {
            IERC20(token).safeDecreaseAllowance(target, newAllowance);
        }

        if (success) {
            // On success, refund any leftover tokens to the refundReceiver.
            uint256 remaining = IERC20(token).balanceOf(address(this));
            if (remaining > 0) {
                IERC20(token).safeTransfer(refundReceiver, remaining);
            }
            emit CallExecuted(srcSender, target, token, amount, result);
        } else {
            // On failure, refund all tokens to the refundReceiver.
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (balance > 0) {
                IERC20(token).safeTransfer(refundReceiver, balance);
            }
            emit CallFailedAndRefunded(srcSender, token, refundReceiver, amount);
        }
    }
}
