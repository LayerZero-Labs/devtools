// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { MessagingFee, MessagingReceipt, OFTCoreUpgradeable, OFTFeeDetail, OFTLimit, OFTReceipt, SendParam } from "./OFTCoreUpgradeable.sol";

/**
 * @title NativeOFTAdapterUpgradeable Contract
 * @dev NativeOFTAdapterUpgradeable is a contract that adapts native currency to the OFT functionality.
 *
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT, which needs to be done very carefully.
 * @dev WARNING: The default NativeOFTAdapter implementation assumes LOSSLESS transfers, ie. 1 native in, 1 native out.
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

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) public payable virtual override returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        // @dev TODO: Move duplicated core logic to OFTCoreUpgradeable._send,
        // similar to how OFTCore._send and NativeOFTAdapter.send work in non-upgradeable versions.
        
        // @dev Ensure the native funds in msg.value are exactly enough to cover the fees and amount to send (with dust removed).
        // @dev This will revert if the _sendParam.amountLD contains any dust
        uint256 requiredMsgValue = _fee.nativeFee + _removeDust(_sendParam.amountLD);
        if (msg.value != requiredMsgValue) {
            revert IncorrectMessageValue(msg.value, requiredMsgValue);
        }

        // @dev Applies the native transfers regarding this send() operation.
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
     *
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, ie. 1 token in, 1 token out.
     * IF the 'innerToken' applies something like a transfer fee, the default will NOT work...
     * a pre/post balance check will need to be done to calculate the amountReceivedLD.
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

    /**
     * @notice Provides the fee breakdown and settings data for an OFT. Unused in the default implementation.
     * @param _sendParam The parameters for the send operation.
     * @return oftLimit The OFT limit information.
     * @return oftFeeDetails The details of OFT fees.
     * @return oftReceipt The OFT receipt information.
     */
    function quoteOFT(
        SendParam calldata _sendParam
    )
    external
    view
    virtual
    override
    returns (OFTLimit memory oftLimit, OFTFeeDetail[] memory oftFeeDetails, OFTReceipt memory oftReceipt)
    {
        uint256 minAmountLD = 0; // Unused in the default implementation.
        uint256 maxAmountLD = type(uint256).max; // Unused in the default implementation.
        oftLimit = OFTLimit(minAmountLD, maxAmountLD);

        // Unused in the default implementation; reserved for future complex fee details.
        oftFeeDetails = new OFTFeeDetail[](0);

        // @dev This is the same as the send() operation, but without the actual send.
        // - amountSentLD is the amount in local decimals that would be sent from the sender.
        // - amountReceivedLD is the amount in local decimals that will be credited to the recipient on the remote OFT instance.
        // @dev The amountSentLD MIGHT not equal the amount the user actually receives. HOWEVER, the default does.
        (uint256 amountSentLD, uint256 amountReceivedLD) = _debitView(
            _sendParam.amountLD,
            _sendParam.minAmountLD,
            _sendParam.dstEid
        );
        oftReceipt = OFTReceipt(amountSentLD, amountReceivedLD);
    }
}
