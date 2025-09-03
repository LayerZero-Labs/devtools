// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { MessagingFee, MessagingReceipt, OFTCoreUpgradeable, OFTFeeDetail, OFTLimit, OFTReceipt, SendParam } from "./OFTCoreUpgradeable.sol";

/**
 * @title NativeOFTAdapterUpgradeable Contract
 * @dev NativeOFTAdapterUpgradeable is a contract that adapts native currency to the OFT functionality.
 *
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT, which needs to be done very carefully.
 * @dev WARNING: The default NativeOFTAdapterUpgradeable implementation assumes LOSSLESS transfers, ie. 1 native in, 1 native out.
 */
abstract contract NativeOFTAdapterUpgradeable is OFTCoreUpgradeable {

    error IncorrectMessageValue(uint256 provided, uint256 required);
    error CreditFailed(address to, uint256 amountLD, bytes revertData);

    /**
     * @dev Constructor for the NativeOFTAdapterUpgradeable contract.
     * @param _localDecimals The decimals of the native on the local chain (this chain). 18 on ETH.
     * @param _lzEndpoint The LayerZero endpoint address.
     */
    constructor(
        uint8 _localDecimals,
        address _lzEndpoint
    ) OFTCoreUpgradeable(_localDecimals, _lzEndpoint) {}

    /**
     * @dev Initializes the NativeOFTAdapterUpgradeable with the provided delegate.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     *
     * @dev The delegate typically should be set as the owner of the contract.
     * @dev Ownable is not initialized here on purpose. It should be initialized in the child contract to
     * accommodate the different version of Ownable.
     */
    function __NativeOFTAdapter_init(address _delegate) internal onlyInitializing {
        __OFTCore_init(_delegate);
    }

    function __NativeOFTAdapter_init_unchained() internal onlyInitializing {}

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
        // @dev Transfer tokens to the recipient.
        (bool success, bytes memory data) = payable(_to).call{value: _amountLD}("");
        if (!success) {
            revert CreditFailed(_to, _amountLD, data);
        }

        // @dev In the case of NON-default NativeOFTAdapter, the amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }

    /**
     * @dev Overridden to be empty as this assertion is done higher up on the overriden send() function.
     * @param _nativeFee The native fee to be paid.
     * @return nativeFee The amount of native currency paid.
     */
    function _payNative(uint256 _nativeFee) internal pure override returns (uint256 nativeFee) {
        return _nativeFee;
    }
}
