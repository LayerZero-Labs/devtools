// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { MessagingFee, MessagingReceipt, OFTCore, OFTReceipt, SendParam } from "./OFTCore.sol";

/**
 * @title NativeOFTAdapter Contract
 * @dev NativeOFTAdapter is a contract that adapts native currency to the OFT functionality.
 *
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT and needs to be done very carefully.
 * @dev WARNING: The default NativeOFTAdapter implementation assumes LOSSLESS transfers, ie. 1 native in, 1 native out.
 */
abstract contract NativeOFTAdapter is OFTCore {

    address public constant NATIVE_TOKEN_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    error InsufficientMessageValue(uint256 provided, uint256 required);
    error CreditFailed();

    /**
     * @dev Constructor for the NativeOFTAdapter contract.
     * @param _localDecimals The decimals of the native on the local chain (this chain). 18 on ETH.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        uint8 _localDecimals,
        address _lzEndpoint,
        address _delegate
    ) OFTCore(_localDecimals, _lzEndpoint, _delegate) {}

    /**
     * @dev Locks native sent by the sender as msg.value
     * @param _amountLD The amount of native to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     */
    function _debit(
        address /*_from*/,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        // @dev Lock native funds by moving them into this contract from the caller.
        // No need to transfer here since msg.value moves funds to the contract.
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
    }

    /**
     * @dev Credits native to the specified address.
     * @param _to The address to credit the native to.
     * @param _amountLD The amount of native to credit.
     * @dev _srcEid The source chain ID.
     * @return amountReceivedLD The amount of native ACTUALLY received.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /*_srcEid*/
    ) internal virtual override returns (uint256 amountReceivedLD) {
        // @dev Transfer tokens to the recipient.
        (bool success, ) = payable(_to).call{value: _amountLD}("");
        if (!success) {
            revert CreditFailed();
        }

        // @dev In the case of NON-default NativeOFTAdapter, the amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable virtual override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        if (_fee.nativeFee + _sendParam.amountLD != msg.value) {
            revert NotEnoughNative(msg.value);
        }

        // return super.send(_sendParam, _fee, _refundAddress); // TODO fix this later -- doesn't seem to recognize OFTCore.send

        // @dev Applies the token transfers regarding this send() operation.
        // - amountSentLD is the amount in local decimals that was ACTUALLY sent/debited from the sender.
        // - amountReceivedLD is the amount in local decimals that will be received/credited to the recipient on the remote OFT instance.
        (uint256 amountSentLD, uint256 amountReceivedLD) = _debit(
            msg.sender,
            _sendParam.amountLD,
            _sendParam.minAmountLD,
            _sendParam.dstEid
        );

        // @dev Builds the options and OFT message to quote in the endpoint.
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam, amountReceivedLD);

        // @dev Sends the message to the LayerZero endpoint and returns the LayerZero msg receipt.
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);
        // @dev Formulate the OFT receipt.
        oftReceipt = OFTReceipt(amountSentLD, amountReceivedLD);

        emit OFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, amountSentLD, amountReceivedLD);
    }

    /**
     * @dev Returns the address of the native token
     * @return The address of the native token.
     */
    function token() public pure returns (address) {
        return NATIVE_TOKEN_ADDRESS;
    }

    /**
     * @notice Indicates whether the OFT contract requires approval of the 'token()' to send.
     * @return requiresApproval Needs approval of the underlying token implementation.
     *
     * @dev In the case of default NativeOFTAdapter, approval is not required.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return false;
    }

    // @dev Overridden to be empty as this assertion is done higher up on the send function.
    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {}
}
