// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

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

    mapping(bytes32 guid => FailedMessage) public failedMessages;

    constructor(address _ovault, address _assetOFT, address _shareOFT) {
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
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam);
            emit DecodeFailed(_guid, _refundOFT, sendParamEncoded);
            return;
        }

        /// @dev Try to early catch ONLY when the target OFT does not have a peer set for the destination chain.
        if (_isInvalidPeer(oft, sendParam.dstEid)) {
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam);
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
            failedMessages[_guid] = FailedMessage(oft, sendParam, _refundOFT, refundSendParam);
            emit OVaultError(_guid, oft, errMsg); /// @dev Since the ovault can revert with custom errors, the error message is valuable
            return;
        }

        /// @dev Try sending the message to the target OFT
        try this.send{ value: msg.value }(oft, sendParam) {
            emit Sent(_guid, oft);
        } catch {
            /// @dev A failed send can happen due to not enough msg.value
            /// @dev Since we have the target tokens in the composer, we can retry with more gas.
            failedMessages[_guid] = FailedMessage(oft, sendParam, address(0), refundSendParam);
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

        vaultAmount = _executeOVaultAction(_oft, _amount);

        if (vaultAmount < _minAmountLD) {
            /// @dev Will rollback on this function's storage changes (trade does not happen)
            revert NotEnoughTargetTokens(vaultAmount, _minAmountLD);
        }
    }

    /// @dev External call for try...catch logic in lzCompose()
    function send(address _oft, SendParam calldata _sendParam) external payable nonReentrant {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        /// @dev If the destination is the HUB chain, we just transfer the tokens to the receiver
        if (_sendParam.dstEid == HUB_EID) {
            _executeHubTransfer(_oft, _sendParam.to.bytes32ToAddress(), _sendParam.amountLD);
            return;
        }

        /// @dev If the destination is not the HUB chain, we send the message to the target OFT
        _send(_oft, _sendParam);
    }

    /// @dev Permissionless function to send back the message to the source chain
    /// @dev Always possible unless the lzCompose() fails due to an Out-Of-Gas panic
    function refund(bytes32 _guid, bytes calldata _extraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedMessage.refundOFT != address(0)) revert CanNotRefund(_guid);

        delete failedMessages[_guid];

        SendParam memory refundSendParam = failedMessage.refundSendParam;
        address refundOft = failedMessage.oft;

        /// @dev If the destination is the HUB chain, we just transfer the tokens to the receiver
        if (refundSendParam.dstEid == HUB_EID) {
            _executeHubTransfer(refundOft, refundSendParam.to.bytes32ToAddress(), refundSendParam.amountLD);
            return;
        }

        refundSendParam.extraOptions = _extraOptions;

        _send(refundOft, refundSendParam);
        emit Refunded(_guid, refundOft);
    }

    /// @dev Permissionless function to retry the message with more gas
    /// @dev Failure case when there is a LayerZero config issue - ex: dvn config
    function retry(bytes32 _guid, bytes calldata _extraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (_failedGuidState(failedMessage) != FailedState.CanOnlyRetry) revert CanNotRetry(_guid);

        delete failedMessages[_guid];

        SendParam memory sendParam = failedMessage.sendParam;
        address retryOFT = failedMessage.oft;

        /// @dev If the destination is the HUB chain, we just transfer the tokens to the receiver
        if (sendParam.dstEid == HUB_EID) {
            _executeHubTransfer(retryOFT, sendParam.to.bytes32ToAddress(), sendParam.amountLD);
            return;
        }

        sendParam.extraOptions = _extraOptions;

        _send(retryOFT, sendParam);
        emit Retried(_guid, retryOFT);
    }

    /// @dev Retry mechanism for transactions that failed due to slippage. This can revert.
    /// @dev Failure case when there is a LayerZero config issue - ex: dvn config
    function retryWithSwap(bytes32 _guid, bytes calldata _extraOptions) external payable {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (_failedGuidState(failedMessage) != FailedState.CanRetryWithSwapOrRefund) revert CanNotRetry(_guid);

        uint256 srcAmount = failedMessage.refundSendParam.amountLD;
        delete failedMessages[_guid];

        SendParam memory sendParam = failedMessage.sendParam;
        address retryOFT = failedMessage.oft;

        sendParam.amountLD = this.executeOVaultActionWithSlippageCheck(
            failedMessage.refundOFT,
            srcAmount,
            sendParam.minAmountLD
        );

        /// @dev If the destination is the HUB chain, we just transfer the tokens to the receiver
        if (sendParam.dstEid == HUB_EID) {
            _executeHubTransfer(retryOFT, sendParam.to.bytes32ToAddress(), sendParam.amountLD);
            return;
        }

        sendParam.extraOptions = _extraOptions;

        _send(retryOFT, sendParam);
        emit Sent(_guid, retryOFT);
    }

    /// @dev Helper to view the state of a failed message
    function failedGuidState(bytes32 _guid) external view returns (FailedState) {
        FailedMessage memory failedMessage = failedMessages[_guid];
        return _failedGuidState(failedMessage);
    }

    function _executeOVaultAction(address _oft, uint256 _amount) internal returns (uint256 vaultAmount) {
        if (_oft == address(ASSET_OFT)) {
            vaultAmount = OVAULT.deposit(_amount, address(this));
        } else {
            vaultAmount = OVAULT.redeem(_amount, address(this), address(this));
        }
    }

    /// @dev Internal function to send the message to the target OFT
    /// @dev In the event you're using a bundler or anything where the tx.origin is not the right receiver then this function will have to be overridden.
    function _send(address _oft, SendParam memory _sendParam) internal {
        IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), tx.origin);
    }

    function _executeHubTransfer(address _oft, address _receiver, uint256 _amountLD) internal {
        IERC20 token = IERC20(IOFT(_oft).token());
        token.safeTransfer(_receiver, _amountLD);
        if (msg.value > 0) {
            (bool sent, ) = _receiver.call{ value: msg.value }("");
            require(sent, "Failed to send Ether");
        }
        emit SentOnHub(_receiver, _oft, _amountLD);
    }

    /// @dev Helper to check if the target OFT does not have a peer set for the destination chain OR if our target chain is the not the same as the HUB chain
    function _isInvalidPeer(address _oft, uint32 _dstEid) internal view returns (bool) {
        return _dstEid != HUB_EID && IOAppCore(_oft).peers(_dstEid) == bytes32(0);
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

        return FailedState.CanRetryWithSwapOrRefund;
    }
    receive() external payable {}
}
