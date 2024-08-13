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

    error DepositFailed();
    error InsufficientMessageValue(uint256 provided, uint256 required);
    error WithdrawalFailed();

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
     * @param _from The address to debit from.
     * @param _amountLD The amount of native to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        // @dev Lock native funds by moving them into this contract from the caller.
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);

        (bool success, ) = payable(address(this)).call{value: amountSentLD}("");
        if (!success) {
            revert DepositFailed();
        }
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
        // TODO should there be some check on a mapping to ensure that msg.sender has previously deposited 
        // amountLD worth of native before withdrawing?

        // @dev Unlock the tokens and transfer to the recipient.
        (bool success, ) = payable(_to).call{value: _amountLD}("");
        if (!success) {
            revert WithdrawalFailed();
        }

        // @dev In the case of NON-default NativeOFTAdapter, the amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        // TODO if we are not extending erc20 then maybe there should be a mapping of how much each sender has already locked in the contract?
        // UNLESS sendParam.amountLD is always equal to msg.value in which case we can just use msg.value

        if (msg.value < _sendParam.amountLD) {
            revert InsufficientMessageValue(msg.value, _sendParam.amountLD);
        }
        
        MessagingFee memory feeWithExtraAmount = MessagingFee({
            nativeFee: _fee.nativeFee,
            lzTokenFee: _fee.lzTokenFee
        });

        uint256 remainingMsgValue = msg.value - _sendParam.amountLD;
        feeWithExtraAmount.nativeFee = remainingMsgValue;

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
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, feeWithExtraAmount, _refundAddress);
        // @dev Formulate the OFT receipt.
        oftReceipt = OFTReceipt(amountSentLD, amountReceivedLD);

        emit OFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, amountSentLD, amountReceivedLD);
    }

    receive() external payable {} // TODO may need to add logic here to update a mapping that tracks how much native each sender has locked in this contract

    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        if (msg.value < _nativeFee) revert NotEnoughNative(msg.value);
        return _nativeFee;
    }
}
