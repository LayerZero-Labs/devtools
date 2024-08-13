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
        // @dev Unlock the tokens and transfer to the recipient.
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
    ) external payable override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        if (_fee.nativeFee + _sendParam.amountLD != msg.value) {
            revert NotEnoughNative(msg.value);
        }

        return super.send(_sendParam, _fee, _refundAddress);
    }
}
