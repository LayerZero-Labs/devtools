// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOFTWithDecimalConversionRate as IOFT } from "./interfaces/IOFTWithDecimalConversionRate.sol";
import { IOVaultComposer, FailedMessage, FailedState } from "./interfaces/IOVaultComposer.sol";

contract OVaultComposer is IOVaultComposer, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    address public immutable ASSET_OFT; // any OFT
    address public immutable SHARE_OFT; // lockbox adapter
    IERC4626 public immutable OVAULT; // IERC4626
    address public immutable ENDPOINT;
    uint32 public immutable HUB_EID;
    uint256 public immutable ASSET_DECIMAL_CONVERSION_RATE;
    uint256 public immutable SHARE_DECIMAL_CONVERSION_RATE;

    address public immutable REFUND_OVERPAY_ADDRESS;

    mapping(bytes32 guid => FailedMessage) public failedMessages;

    constructor(address _ovault, address _assetOFT, address _shareOFT, address _refundOverpayAddress) {
        OVAULT = IERC4626(_ovault);
        ASSET_OFT = _assetOFT;
        SHARE_OFT = _shareOFT;

        if (!IOFT(_shareOFT).approvalRequired()) {
            revert ShareOFTShouldBeLockboxAdapter(address(_shareOFT));
        }

        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());
        HUB_EID = ILayerZeroEndpointV2(ENDPOINT).eid();

        // Approve the ovault to spend the share and asset tokens held by this contract
        IERC20(IOFT(_shareOFT).token()).approve(address(_ovault), type(uint256).max);
        IERC20(IOFT(_assetOFT).token()).approve(address(_ovault), type(uint256).max);

        // Approve the shareOFTAdapter with the share tokens held by this contract
        IERC20(IOFT(_shareOFT).token()).approve(_shareOFT, type(uint256).max);

        ASSET_DECIMAL_CONVERSION_RATE = IOFT(_assetOFT).decimalConversionRate();
        SHARE_DECIMAL_CONVERSION_RATE = IOFT(_shareOFT).decimalConversionRate();

        REFUND_OVERPAY_ADDRESS = _refundOverpayAddress;
    }

    /// @dev This composer is designed to handle refunds to an EOA address and not a contract.
    function lzCompose(
        address _refundOFT,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        if (msg.sender != ENDPOINT) revert OnlyEndpoint(msg.sender);
        if (_refundOFT != ASSET_OFT && _refundOFT != SHARE_OFT) revert OnlyOFT(_refundOFT);

        /// @dev Route to the correct target OFT
        address oft = _refundOFT == ASSET_OFT ? SHARE_OFT : ASSET_OFT;

        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        uint256 amount = OFTComposeMsgCodec.amountLD(_message);
        bytes memory sendParamEncoded = OFTComposeMsgCodec.composeMsg(_message);

        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = amount;

        SendParam memory sendParam;

        /// @dev Try decoding the composeMsg as a SendParam
        try this.decodeSendParam(sendParamEncoded) returns (SendParam memory sendParamDecoded) {
            /// @dev In the case of a valid decode we have the raw SendParam to be forwarded to the target OFT (oft)
            sendParam = sendParamDecoded;
            /// @dev Setting target amount to 0 since the actual value will be determined by executeOVaultAction() (i.e. deposit or redeem)
            sendParam.amountLD = 0;
        } catch {
            /// @dev In the case of a failed decode we store the failed message and emit an event.
            /// @dev This message can only be refunded back to the source chain.
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam, msg.value);
            emit DecodeFailed(_guid, _refundOFT, sendParamEncoded);
            return;
        }

        /// @dev Try to early catch ONLY when the target OFT does not have a peer set for the destination chain.
        if (_isInvalidPeer(oft, sendParam.dstEid)) {
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam, msg.value);
            emit NoPeer(_guid, oft, sendParam.dstEid);
            return;
        }

        /// @dev Try to execute the action on the target OFT. If we hit an issue then it rolls back the storage changes.
        try this.executeOVaultActionWithSlippageCheck(_refundOFT, amount, sendParam.minAmountLD) returns (
            uint256 vaultAmount
        ) {
            /// @dev Setting the target amount to the actual value of the action (i.e. deposit or redeem)
            sendParam.amountLD = vaultAmount;
        } catch (bytes memory errMsg) {
            failedMessages[_guid] = FailedMessage(oft, sendParam, _refundOFT, refundSendParam, msg.value);
            emit OVaultError(_guid, oft, errMsg); /// @dev Since the ovault can revert with custom errors, the error message is valuable
            return;
        }

        /// @dev Try sending the message to the target OFT
        try this.send{ value: msg.value }(oft, sendParam) {
            emit Sent(_guid, oft);
        } catch {
            /// @dev A failed send can happen due to not enough msg.value
            /// @dev Since we have the target tokens in the composer, we can retry with more gas.
            failedMessages[_guid] = FailedMessage(oft, sendParam, address(0), refundSendParam, msg.value);
            emit SendFailed(_guid, oft); /// @dev This can be due to msg.value or layerzero config (dvn config, etc)
            return;
        }
    }

    /// @dev External call for try...catch logic in lzCompose()
    function decodeSendParam(bytes calldata sendParamBytes) external pure returns (SendParam memory sendParam) {
        sendParam = abi.decode(sendParamBytes, (SendParam));
    }

    /// @dev External call for try...catch logic in lzCompose()
    function executeOVaultActionWithSlippageCheck(
        address _oft,
        uint256 _amount,
        uint256 _minAmountLD
    ) external nonReentrant returns (uint256 vaultAmount) {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        vaultAmount = _executeOVaultActionWithSlippageCheck(_oft, _amount, _minAmountLD);
    }

    /// @dev External call for try...catch logic in lzCompose()
    function send(address _oft, SendParam calldata _sendParam) external payable nonReentrant {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        /// @dev If the destination is the HUB chain, we just transfer the tokens to the receiver
        if (_sendParam.dstEid == HUB_EID) {
            address _receiver = _sendParam.to.bytes32ToAddress();
            uint256 _amountLD = _sendParam.amountLD;
            IERC20 token = IERC20(IOFT(_oft).token());
            token.transfer(_receiver, _amountLD);
            if (msg.value > 0) {
                (bool sent, ) = _receiver.call{ value: msg.value }("");
                require(sent, "Failed to send Ether");
            }
            emit SentOnHub(_receiver, _oft, _amountLD);
            return;
        }

        /// @dev If the destination is not the HUB chain, we send the message to the target OFT
        _send(_oft, _sendParam, msg.value, tx.origin);
    }

    /// @dev Permissionless function to send back the message to the source chain
    /// @dev Always possible unless the lzCompose() fails due to an Out-Of-Gas panic
    function refund(bytes32 _guid) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        FailedState f = _failedGuidState(failedMessage);
        if ((f != FailedState.CanOnlyRefund) && (f != FailedState.CanRefundOrRetryWithSwap)) revert CanNotRefund(_guid);

        delete failedMessages[_guid];

        this.sendFailedMessage{ value: msg.value }(
            _guid,
            failedMessage.refundOFT,
            failedMessage.refundSendParam,
            failedMessage.msgValue,
            REFUND_OVERPAY_ADDRESS
        );
        emit Refunded(_guid, failedMessage.refundOFT);
    }

    /// @dev Permissionless function to retry the message with more gas
    /// @dev Failure case when there is a LayerZero config issue - ex: dvn config
    function retry(bytes32 _guid, bool _removeExtraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (_failedGuidState(failedMessage) != FailedState.CanOnlyRetry) revert CanNotRetry(_guid);

        SendParam memory sendParam = failedMessage.sendParam;
        uint256 prepaidMsgValue = failedMessage.msgValue;

        if (_removeExtraOptions) {
            (bool sent, ) = payable(REFUND_OVERPAY_ADDRESS).call{ value: prepaidMsgValue }("");
            require(sent, "Failed to send Ether");

            sendParam.extraOptions = "";
            prepaidMsgValue = 0;
        }

        delete failedMessages[_guid];
        this.sendFailedMessage{ value: msg.value }(_guid, failedMessage.oft, sendParam, prepaidMsgValue, tx.origin);
        emit Retried(_guid, failedMessage.oft);
    }

    /// @dev Retry mechanism for transactions that failed due to slippage. This can revert.
    /// @dev Failure case when there is a LayerZero config issue - ex: dvn config
    function retryWithSwap(bytes32 _guid, bool _skipRetry) external payable {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (_failedGuidState(failedMessage) != FailedState.CanRefundOrRetryWithSwap) revert CanNotSwap(_guid);

        if (_skipRetry && msg.value > 0) revert NoMsgValueWhenSkippingRetry();

        failedMessage.sendParam.amountLD = _executeOVaultActionWithSlippageCheck(
            failedMessage.refundOFT,
            failedMessage.refundSendParam.amountLD,
            failedMessage.sendParam.minAmountLD
        );

        /// @dev Perform global state update.
        /// @dev Disable refund. If this call reverts refund is still possible.
        /// @dev Store the vault out amount for the retry.
        failedMessages[_guid].refundOFT = address(0);
        failedMessages[_guid].sendParam.amountLD = failedMessage.sendParam.amountLD;

        emit SwappedTokens(_guid);

        /// @dev Regardless of the outcome of skipRetry and sendFailedMessage, the failedMessage is now in a RETRY only state.
        /// @dev try..catch to accumulate the msg.value in the case of a failed send
        if (!_skipRetry) {
            try
                this.sendFailedMessage{ value: msg.value }(
                    _guid,
                    failedMessage.oft,
                    failedMessage.sendParam,
                    failedMessage.msgValue,
                    tx.origin
                )
            {
                emit Retried(_guid, failedMessage.oft);
            } catch {
                failedMessages[_guid].msgValue += msg.value;
                emit SendFailed(_guid, failedMessage.oft);
            }
        }
    }

    function sendFailedMessage(
        bytes32 _guid,
        address _oft,
        SendParam memory _sendParam,
        uint256 _prePaidMsgValue,
        address _refundOverpayAddress
    ) external payable {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        delete failedMessages[_guid];

        uint256 netMsgValue = msg.value + _prePaidMsgValue;
        _send(_oft, _sendParam, netMsgValue, _refundOverpayAddress);
        emit Sent(_guid, _oft);
    }

    function _executeOVaultActionWithSlippageCheck(
        address _refundOFT,
        uint256 _amount,
        uint256 _minAmountLD
    ) internal returns (uint256 vaultAmount) {
        address targetOFT; /// @note optimize setting of targetOFT

        if (_refundOFT == address(ASSET_OFT)) {
            vaultAmount = OVAULT.deposit(_amount, address(this));
            targetOFT = SHARE_OFT;
        } else if (_refundOFT == address(SHARE_OFT)) {
            vaultAmount = OVAULT.redeem(_amount, address(this), address(this));
        }

        _checkSlippage(targetOFT, vaultAmount, _minAmountLD);
    }

    /// @dev Internal function to send the message to the target OFT
    /// @dev In the event you're using a bundler or anything where the tx.origin is not the intended refund receiver then this function will have to be overridden.
    /// @dev Slippage check happens at the OFT for : amountLD >= sendParam.minAmountLD
    /// @dev Handles the case where the dstEid is the HUB chain
    function _send(
        address _oft,
        SendParam memory _sendParam,
        uint256 _totalMsgValue,
        address _refundOverpayAddress
    ) internal virtual {
        if (_sendParam.dstEid == HUB_EID) {
            address token = IOFT(_oft).token();
            address to = _sendParam.to.bytes32ToAddress();
            uint256 amountLD = _sendParam.amountLD;

            IERC20(token).safeTransfer(to, amountLD);

            if (_totalMsgValue > 0) {
                (bool sent, bytes memory errMsg) = payable(to).call{ value: _totalMsgValue }("");
                if (!sent) {
                    emit FailedToSendEther(to, _totalMsgValue, errMsg);
                    (bool sent2, ) = payable(REFUND_OVERPAY_ADDRESS).call{ value: _totalMsgValue }("");
                    if (!sent2) {
                        emit FailedToSendEther(REFUND_OVERPAY_ADDRESS, _totalMsgValue, "Failed to send Ether");
                    }
                }
            }

            emit SentOnHub(to, _oft, amountLD);
        } else {
            IOFT(_oft).send{ value: _totalMsgValue }(
                _sendParam,
                MessagingFee(_totalMsgValue, 0),
                _refundOverpayAddress
            );
        }
    }

    /// @dev Helper to check if the target OFT does not have a peer set for the destination chain OR if our target chain is not the same as the HUB chain
    function _isInvalidPeer(address _oft, uint32 _dstEid) internal view returns (bool) {
        return _dstEid != HUB_EID && IOAppCore(_oft).peers(_dstEid) == bytes32(0);
    }

    /// @dev Remove dust before slippage check to be equivalent to OFTCore::_debitView()
    /// @dev If the OFT has a Fee or anything that changes the tokens such that:
    /// @dev dstChain.receivedAmount != srcChain.sentAmount, this will have to be overridden.
    function _checkSlippage(address _oft, uint256 _amount, uint256 _minAmountLD) internal view virtual {
        uint256 vaultAmountLD = _removeDust(_oft, _amount);
        uint256 amountReceivedLD = vaultAmountLD; /// @dev Perform your adjustments here if needed (ex: Fee)
        if (amountReceivedLD < _minAmountLD) {
            revert NotEnoughTargetTokens(amountReceivedLD, _minAmountLD);
        }
    }

    function _removeDust(address _oft, uint256 _amount) internal view returns (uint256) {
        uint256 decimalConversionRate = _oft == address(ASSET_OFT)
            ? ASSET_DECIMAL_CONVERSION_RATE
            : SHARE_DECIMAL_CONVERSION_RATE;
        return (_amount / decimalConversionRate) * decimalConversionRate;
    }

    function _failedGuidState(FailedMessage memory _failedMessage) internal pure returns (FailedState) {
        if (_failedMessage.refundOFT == address(0) && _failedMessage.oft == address(0)) {
            return FailedState.NotFound;
        }
        if (_failedMessage.refundOFT != address(0) && _failedMessage.oft == address(0)) {
            return FailedState.CanOnlyRefund;
        }
        if (_failedMessage.refundOFT == address(0) && _failedMessage.oft != address(0)) {
            return FailedState.CanOnlyRetry;
        }

        return FailedState.CanRefundOrRetryWithSwap;
    }

    function failedGuidState(bytes32 _guid) external view returns (FailedState) {
        return _failedGuidState(failedMessages[_guid]);
    }

    receive() external payable {}
}
