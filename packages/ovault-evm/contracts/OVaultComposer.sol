// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOVaultComposer, FailedMessage, FailedState } from "./interfaces/IOVaultComposer.sol";
import { IOFTWithDecimalConversionRate as IOFT } from "./interfaces/IOFTWithDecimalConversionRate.sol";

contract OVaultComposer is IOVaultComposer, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    address public immutable ASSET_OFT; // any OFT
    address public immutable SHARE_OFT; // lockbox adapter
    IERC4626 public immutable OVAULT; // IERC4626
    address public immutable ENDPOINT;
    uint32 public immutable HUB_EID;

    address public immutable REFUND_OVERPAY_ADDRESS;

    uint256 public immutable ASSET_DECIMAL_CONVERSION_RATE;
    uint256 public immutable SHARE_DECIMAL_CONVERSION_RATE;

    mapping(bytes32 guid => FailedMessage) public failedMessages;

    constructor(address _ovault, address _assetOFT, address _shareOFT, address _refundOverpayAddress) {
        OVAULT = IERC4626(_ovault);
        ASSET_OFT = _assetOFT;
        SHARE_OFT = _shareOFT;

        if (!IOFT(_shareOFT).approvalRequired()) {
            revert ShareOFTShouldBeLockboxAdapter(address(_shareOFT));
        }

        if (address(IOFT(_shareOFT).token()) != address(OVAULT)) {
            revert ShareOFTInnerTokenShouldBeOVault(address(IOFT(_shareOFT).token()), address(OVAULT));
        }

        if (IOFT(_assetOFT).token() != OVAULT.asset()) {
            revert AssetOFTInnerTokenShouldBeOvaultAsset(address(IOFT(_assetOFT).token()), address(OVAULT.asset()));
        }

        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());
        HUB_EID = ILayerZeroEndpointV2(ENDPOINT).eid();

        ASSET_DECIMAL_CONVERSION_RATE = IOFT(_assetOFT).decimalConversionRate();
        SHARE_DECIMAL_CONVERSION_RATE = IOFT(_shareOFT).decimalConversionRate();

        // Approve the ovault to spend the share and asset tokens held by this contract
        IERC20(IOFT(_shareOFT).token()).approve(address(_ovault), type(uint256).max);
        IERC20(IOFT(_assetOFT).token()).approve(address(_ovault), type(uint256).max);

        // Approve the shareOFTAdapter with the share tokens held by this contract
        IERC20(IOFT(_shareOFT).token()).approve(_shareOFT, type(uint256).max);

        REFUND_OVERPAY_ADDRESS = _refundOverpayAddress;
    }

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
        /// @dev This is because we do not know if the vault protocol wants to expand to that chain.
        if (_isInvalidPeer(oft, sendParam.dstEid)) {
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam, msg.value);
            emit NoPeer(_guid, oft, sendParam.dstEid);
            return;
        }

        /// @dev Try to execute the action on the target OFT. If we hit an error then it rolls back the storage changes.
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

        /// @dev Try sending the vault out tokens to the receiver on the target chain (can also be the HUB chain)
        try this.send{ value: msg.value }(oft, sendParam) {
            emit Sent(_guid, oft);
        } catch {
            SendParam memory emptySendParam;
            /// @dev A failed send will result in the target tokens being in the composer, we can retry with:
            /// @dev 1. more msg.value OR
            /// @dev 2. after the config is fixed OR
            /// @dev 3. without extraOptions (re-executor needs to pay the entire msg.value)
            failedMessages[_guid] = FailedMessage(oft, sendParam, address(0), emptySendParam, msg.value);
            emit SendFailed(_guid, oft);
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
        _send(_oft, _sendParam, msg.value, tx.origin);
    }

    /// @dev Always uses enforced options to send the transaction to an EOA.
    /// @dev Custom logic to be implemented by the developer in the case where the sender is NOT an EOA.
    /// @dev If the total msg.value (cached + supplier) is greater than the consumed msg.value, the excess is sent to the REFUND_OVERPAY_ADDRESS
    function refund(bytes32 _guid) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];

        FailedState f = _failedGuidState(failedMessage);
        if ((f != FailedState.CanOnlyRefund) && (f != FailedState.CanRefundOrRetryWithSwap)) revert CanNotRefund(_guid);

        try
            this.sendFailedMessage{ value: msg.value }(
                _guid,
                failedMessage.refundOFT,
                failedMessage.refundSendParam,
                failedMessage.msgValue,
                REFUND_OVERPAY_ADDRESS
            )
        {
            emit Refunded(_guid, failedMessage.refundOFT);
        } catch (bytes memory errMsg) {
            emit SendFailed(_guid, failedMessage.refundOFT);

            if (errMsg.length > 0) {
                assembly {
                    revert(add(errMsg, 32), mload(errMsg))
                }
            }
            revert();
        }
    }

    /// @dev If removeExtraOptions is true, only enforcedOptions are used and the sender needs to pay the entire msg.value
    /// @dev A transaction can never fail due to a lack of extraOptions, unless the OFT is customized in-which case the Composer would need to be customized.
    function retry(bytes32 _guid, bool removeExtraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (_failedGuidState(failedMessage) != FailedState.CanOnlyRetry) revert CanNotRetry(_guid);

        SendParam memory sendParam = failedMessage.sendParam;
        uint256 prePaidMsgValue = failedMessage.msgValue;

        if (removeExtraOptions) {
            (bool sent, ) = payable(REFUND_OVERPAY_ADDRESS).call{ value: prePaidMsgValue }("");
            require(sent, "Failed to send Ether");

            sendParam.extraOptions = "";
            prePaidMsgValue = 0;
        }

        try
            this.sendFailedMessage{ value: msg.value }(_guid, failedMessage.oft, sendParam, prePaidMsgValue, tx.origin)
        {
            emit Retried(_guid, failedMessage.oft);
        } catch (bytes memory errMsg) {
            emit SendFailed(_guid, failedMessage.oft);

            if (errMsg.length > 0) {
                assembly {
                    revert(add(errMsg, 32), mload(errMsg))
                }
            }
            revert();
        }
    }

    /// @dev Performs the ovault action for a failed swap. If we fail on the send then the GUID enters the retry state for manual execution.
    function retryWithSwap(bytes32 _guid, bool skipRetry) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (_failedGuidState(failedMessage) != FailedState.CanRefundOrRetryWithSwap) revert CanNotSwap(_guid);

        /// @dev Disable refund. If this call reverts refund is still possible.
        failedMessages[_guid].refundOFT = address(0);

        uint256 srcAmount = failedMessage.refundSendParam.amountLD;

        uint256 vaultAmount = _executeOVaultActionWithSlippageCheck(
            failedMessage.refundOFT,
            srcAmount,
            failedMessage.sendParam.minAmountLD
        );

        failedMessage.sendParam.amountLD = vaultAmount;
        emit SwappedTokens(_guid);

        /// @dev Regardless of the outcome of skipRetry and sendFailedMessage, the failedMessage is now in a RETRY only state.
        if (!skipRetry) {
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

        uint256 totalMsgValue = _prePaidMsgValue + msg.value;
        _send(_oft, _sendParam, totalMsgValue, _refundOverpayAddress);
    }

    /// @dev Helper to view the state of a failed message
    function failedGuidState(bytes32 _guid) external view returns (FailedState) {
        FailedMessage memory failedMessage = failedMessages[_guid];
        return _failedGuidState(failedMessage);
    }

    function _executeOVaultActionWithSlippageCheck(
        address _oft,
        uint256 _amount,
        uint256 _minAmountLD
    ) internal returns (uint256 vaultAmount) {
        if (_oft == address(ASSET_OFT)) {
            vaultAmount = OVAULT.deposit(_amount, address(this));
        } else {
            vaultAmount = OVAULT.redeem(_amount, address(this), address(this));
        }

        /// @dev Remove dust before slippage check to be equivalent to OFTCore::_debitView()
        uint256 vaultAmountLD = _removeDust(_oft, vaultAmount);
        if (vaultAmountLD < _minAmountLD) {
            revert NotEnoughTargetTokens(vaultAmountLD, _minAmountLD);
        }
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
    ) internal {
        if (_sendParam.dstEid == HUB_EID) {
            address token = IOFT(_oft).token();
            address to = _sendParam.to.bytes32ToAddress();

            uint256 amountLD = _sendParam.amountLD;
            IERC20(token).safeTransfer(to, amountLD);

            if (_totalMsgValue > 0) {
                (bool sent, ) = to.call{ value: _totalMsgValue }("");
                require(sent, "Failed to send Ether");
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

    receive() external payable {}
}
