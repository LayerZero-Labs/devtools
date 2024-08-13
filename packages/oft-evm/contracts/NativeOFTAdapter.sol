// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { MessagingFee, MessagingReceipt, OFTCore, OFTReceipt, SendParam } from "./OFTCore.sol";

/**
 *
 * @title NativeOFTAdapter
 * @dev NativeOFTAdapter is a contract that adapts native currency to the OFT functionality.
 *
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT, which needs to be done very carefully.
 * @dev WARNING: The default NativeOFTAdapter implementation assumes LOSSLESS transfers, ie. 1 native in, 1 native out.
 */
abstract contract NativeOFTAdapter is OFTCore {

    error IncorrectMessageValue(uint256 provided, uint256 required);
    error CreditFailed(address to, uint256 amountLD, bytes revertData);

    /**
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
     * @dev Returns the address of the native token
     * @return The address of the native token.
     */
    function token() public pure returns (address) {
        return address(0);
    }

    /**
     * @notice Indicates whether the OFT contract requires approval of the 'token()' to send.
     * @return bool indicating whether approval of underlying token implementation is required.
     *
     * @dev In the case of default NativeOFTAdapter, approval is not required.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return false;
    }

    /**
     * @dev Executes the send operation while ensuring the correct amount of native is sent.
     * @param _sendParam The parameters for the send operation.
     * @param _fee The calculated fee for the send() operation.
     *      - nativeFee: The native fee.
     *      - lzTokenFee: The lzToken fee.
     * @param _refundAddress The address to receive any excess funds.
     * @return msgReceipt The receipt for the send operation.
     * @return oftReceipt The OFT receipt information.
     *
     * @dev MessagingReceipt: LayerZero msg receipt
     *  - guid: The unique identifier for the sent message.
     *  - nonce: The nonce of the sent message.
     *  - fee: The LayerZero fee incurred for the message.
     */
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) public payable virtual override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        // @dev Ensure the native funds in msg.value are exactly enough to cover the fees and amount to send (with dust removed).
        // @dev This will revert if the _sendParam.amountLD contains any dust
        uint256 requiredMsgValue = _fee.nativeFee + _removeDust(_sendParam.amountLD);
        if (msg.value != requiredMsgValue) {
            revert IncorrectMessageValue(msg.value, requiredMsgValue);
        }

        return _send(_sendParam, _fee, _refundAddress);
    }

    /**
     * @dev Locks native sent by the sender as msg.value
     * @dev _from The address to debit.
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
        // @dev Native funds sent with msg.value are locked into this contract higher up on the overridden send() function
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
<<<<<<< HEAD
        // @dev Transfer tokens to the recipient.
        (bool success, bytes memory data) = payable(_to).call{value: _amountLD}("");
=======
        // @dev Unlock the tokens and transfer to the recipient.
        (bool success, ) = payable(_to).call{value: _amountLD}("");
>>>>>>> 0330cbdd (removed TODOs)
        if (!success) {
            revert CreditFailed(_to, _amountLD, data);
        }

        // @dev In the case of NON-default NativeOFTAdapter, the amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }

<<<<<<< HEAD
    /**
     * @dev Overridden to be empty as this assertion is done higher up on the overriden send() function.
     * @param _nativeFee The native fee to be paid.
     * @return nativeFee The amount of native currency paid.
     */
    function _payNative(uint256 _nativeFee) internal pure override returns (uint256 nativeFee) {
=======
    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        if (msg.value < _sendParam.amountLD) {
            revert InsufficientMessageValue(msg.value, _sendParam.amountLD);
        }
        
        MessagingFee memory feeWithExtraAmount = MessagingFee({
            nativeFee: _fee.nativeFee,
            lzTokenFee: _fee.lzTokenFee
        });

        uint256 remainingMsgValue = msg.value - _sendParam.amountLD;
        feeWithExtraAmount.nativeFee = remainingMsgValue;

        (uint256 amountSentLD, uint256 amountReceivedLD) = _debit(
            msg.sender,
            _sendParam.amountLD,
            _sendParam.minAmountLD,
            _sendParam.dstEid
        );

        // @dev Builds the options and OFT message to quote in the endpoint.
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam, amountReceivedLD);

        // @dev Sends the message to the LayerZero endpoint and returns the LayerZero msg receipt.
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, feeWithExtraAmount, _refundAddress);
        
        // @dev Formulate the OFT receipt.
        oftReceipt = OFTReceipt(amountSentLD, amountReceivedLD);

        emit OFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, amountSentLD, amountReceivedLD);
    }

    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        if (msg.value < _nativeFee) revert NotEnoughNative(msg.value);
>>>>>>> 0330cbdd (removed TODOs)
        return _nativeFee;
    }
}
