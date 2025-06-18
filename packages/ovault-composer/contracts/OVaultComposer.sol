// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";
import { IOVault } from "./interfaces/IOVault.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOVaultComposer, FailedMessage, FailedState } from "./interfaces/IOVaultComposer.sol";
import { IOVault } from "./interfaces/IOVault.sol";
import { IERC4626Adapter } from "./interfaces/IERC4626Adapter.sol";

contract OVaultComposer is IOVaultComposer, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;

    address public immutable ASSET_OFT;
    address public immutable SHARE_OFT;
    address public immutable OVAULT;
    address public immutable ENDPOINT;

    /// @notice There are 3 states a failed message can be in:
    /// @notice 1. Failed upon entering the composer - FailedMessage.oft == address(0) && FailedMessage.refundOFT == address(0)
    /// @notice 2. Failed to decode the message - FailedMessage.oft == address(0) && FailedMessage.refundOFT != address(0)
    /// @notice 3. Failed to send the message to the target OFT - FailedMessage.oft != address(0) && FailedMessage.refundOFT != address(0)
    ///
    /// @dev State 1 needs lzCompose() to be re-executed
    /// @dev State 2 can only be refunded back to the source chain
    /// @dev State 3 can be refunded back to the source chain or retried with more gas
    mapping(bytes32 guid => FailedMessage) public failedMessages;

    constructor(address _ovault) {
        address share = IERC4626Adapter(_ovault).share();
        address asset = IERC4626Adapter(_ovault).asset();
        if (!IERC20MintBurnExtension(share).ERC4626AdapterCompliant()) {
            revert IOVault.ShareNotERC4626AdapterCompliant();
        }

        OVAULT = _ovault;
        SHARE_OFT = IOVault(_ovault).SHARE_OFT();
        ASSET_OFT = IOVault(_ovault).ASSET_OFT();
        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());

        // Approve the adapter to spend the share tokens held by this contract
        IERC20(share).approve(OVAULT, type(uint256).max);
        IERC20(asset).approve(OVAULT, type(uint256).max);
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
            sendParam.amountLD = 0;
        } catch {
            /// @dev In the case of a failed decode we store the failed message and emit an event.
            /// @dev This message can only be refunded back to the source chain.
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam);
            emit DecodeFailed(_guid, _refundOFT, sendParamEncoded);
            return;
        }

        /// @dev Try to early catch issues surrounding LayerZero config. This quoteSend catches issues like: invalid peer, dvn config, etc.
        try this.validateTargetOFTConfig(oft, sendParam) {} catch (bytes memory errMsg) {
            /// @dev When erroring out we want to NOT make a swap and the user can only go back to the source chain.
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam);
            emit GenericError(_guid, oft, errMsg);
            return;
        }

        /// @dev Try to execute the action on the target OFT. If we hit an issue then it rolls back the storage changes.
        try this.executeOVaultAction(_refundOFT, amount, sendParam) returns (uint256 vaultAmount) {
            sendParam.amountLD = vaultAmount;
        } catch (bytes memory errMsg) {
            failedMessages[_guid] = FailedMessage(oft, sendParam, _refundOFT, refundSendParam);
            emit GenericError(_guid, oft, errMsg);
            return;
        }

        /// @dev Try sending the message to the target OFT
        try this.send{ value: msg.value }(oft, sendParam) {
            emit Sent(_guid, oft);
        } catch {
            /// @dev A failed send can happen due to not enough msg.value
            /// @dev Since we have the target tokens in the composer, we can retry with more gas.
            failedMessages[_guid] = FailedMessage(oft, sendParam, address(0), refundSendParam);
            emit SendFailed(_guid, oft);
            return;
        }
    }

    /// @dev External call for try...catch logic in lzCompose()
    function decodeSendParam(bytes calldata sendParamBytes) external pure returns (SendParam memory sendParam) {
        sendParam = abi.decode(sendParamBytes, (SendParam));
    }

    /// @dev External call for try...catch logic in lzCompose()
    function executeOVaultAction(
        address _oft,
        uint256 _amount,
        SendParam calldata _sendParam
    ) external nonReentrant returns (uint256 vaultAmount) {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);
        vaultAmount = _executeOVaultAction(_oft, _amount);
        if (vaultAmount < _sendParam.minAmountLD) {
            /// @dev Will rollback on this function's storage changes (trade does not happen)
            revert NotEnoughTargetTokens(vaultAmount, _sendParam.minAmountLD);
        }
    }

    /// @dev Dirty swapping amountLD and minAmountLD to 1e18 and 0 to avoid Slippage issue on the target OFT quoteSend()
    function validateTargetOFTConfig(address _oft, SendParam memory _sendParam) external view {
        _sendParam.amountLD = 1e18;
        _sendParam.minAmountLD = 0;

        IOFT(_oft).quoteSend(_sendParam, false);
    }

    /// @dev External call for try...catch logic in lzCompose()
    function send(address _oft, SendParam calldata _sendParam) external payable nonReentrant {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);
        _send(_oft, _sendParam);
    }

    /// @dev Permissionless function to send back the message to the source chain
    /// @dev Always possible unless the lzCompose() fails due to an Out-Of-Gas panic
    function refund(bytes32 _guid, bytes calldata _extraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        SendParam memory refundSendParam = failedMessage.sendParam;
        if (failedGuidState(_guid) != FailedState.CanOnlyRefund) revert CanNotRefund(_guid);

        refundSendParam.extraOptions = _extraOptions;

        delete failedMessages[_guid];
        _send(failedMessage.refundOFT, refundSendParam);
        emit Refunded(_guid, failedMessage.refundOFT);
    }

    /// @dev Permissionless function to retry the message with more gas
    /// @dev Probabilistically possible if the OFT.send() fails - ex: invalid peer
    function retry(bytes32 _guid, bytes calldata _extraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedGuidState(_guid) != FailedState.CanOnlyRetry) revert CanNotRetry(_guid);

        SendParam memory sendParam = failedMessage.sendParam;

        sendParam.extraOptions = _extraOptions;

        delete failedMessages[_guid];
        _send(failedMessage.oft, sendParam);
        emit Retried(_guid, failedMessage.oft);
    }

    /// @dev Retry mechanism for transactions that failed due to slippage. This can revert.
    function retryWithSwap(bytes32 _guid, bytes calldata _extraOptions) external payable {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedGuidState(_guid) != FailedState.CanRetryWithSwap) revert CanNotRetry(_guid);

        SendParam memory sendParam = failedMessage.sendParam;
        sendParam.extraOptions = _extraOptions;

        uint256 amountLd = failedMessage.refundSendParam.amountLD;

        delete failedMessages[_guid];
        sendParam.amountLD = _executeOVaultAction(failedMessage.refundOFT, amountLd);

        _send(failedMessage.oft, sendParam);
        emit Sent(_guid, failedMessage.oft);
    }

    /// @dev Internal function to send the message to the target OFT
    function _send(address _oft, SendParam memory _sendParam) internal {
        IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), tx.origin);
    }

    function _executeOVaultAction(address _oft, uint256 _amount) internal returns (uint256 vaultAmount) {
        if (_oft == ASSET_OFT) {
            vaultAmount = IERC4626Adapter(OVAULT).deposit(_amount, address(this));
        } else {
            vaultAmount = IERC4626Adapter(OVAULT).redeem(_amount, address(this), address(this));
        }
    }

    /// @dev Helper to view the state of a failed message
    function failedGuidState(bytes32 _guid) public view returns (FailedState) {
        FailedMessage memory failedMessage = failedMessages[_guid];

        if (failedMessage.refundOFT == address(0) && failedMessage.oft == address(0)) {
            return FailedState.NotFound;
        }
        if (failedMessage.refundOFT != address(0) && failedMessage.oft == address(0)) {
            return FailedState.CanOnlyRefund;
        }
        if (failedMessage.refundOFT == address(0) && failedMessage.oft != address(0)) {
            return FailedState.CanOnlyRetry;
        }

        return FailedState.CanRetryWithSwap;
    }
    receive() external payable {}
}
