// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";
import { IOVault } from "./interfaces/IOVault.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOVaultComposer, FailedMessage } from "./interfaces/IOVaultComposer.sol";
import { IOVault } from "./interfaces/IOVault.sol";
import { IERC4626Adapter } from "./interfaces/IERC4626Adapter.sol";

contract OVaultComposer is IOVaultComposer, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;

    address public immutable ASSET_OFT;
    address public immutable SHARE_OFT;
    address public immutable OVAULT;
    address public immutable ENDPOINT;

    bool public immutable OPTIMISTICALLY_CONVERT_TOKENS;

    /// @notice There are 3 states a failed message can be in:
    /// @notice 1. Failed upon entering the composer - FailedMessage.oft == address(0) && FailedMessage.refundOFT == address(0)
    /// @notice 2. Failed to decode the message - FailedMessage.oft == address(0) && FailedMessage.refundOFT != address(0)
    /// @notice 3. Failed to send the message to the target OFT - FailedMessage.oft != address(0) && FailedMessage.refundOFT != address(0)
    ///
    /// @dev State 1 needs lzCompose() to be re-executed
    /// @dev State 2 can only be refunded back to the source chain
    /// @dev State 3 can be refunded back to the source chain or retried with more gas
    mapping(bytes32 guid => FailedMessage) public failedMessages;

    constructor(address _ovault, bool _optimisticallyConvertTokens) {
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

        OPTIMISTICALLY_CONVERT_TOKENS = _optimisticallyConvertTokens;
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

        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message); // srcEid
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message); // srcSender
        refundSendParam.amountLD = amount;

        SendParam memory sendParam;

        /// @dev Try decoding the composeMsg as a SendParam
        try this.decodeSendParam(sendParamEncoded) returns (SendParam memory sendParamDecoded) {
            /// @dev In the case of a valid decode we have the raw SendParam to be forwarded to the target OFT (oft)
            sendParam = sendParamDecoded;
        } catch {
            /// @dev In the case of a failed decode we store the failed message and emit an event.
            /// @dev This message can only be refunded back to the source chain.
            failedMessages[_guid] = FailedMessage(address(0), _refundOFT, refundSendParam);
            emit DecodeFailed(_guid, oft, sendParamEncoded);
            return;
        }

        /// @dev If the composer is deployed with `OPTIMISTICALLY_CONVERT_TOKENS` set to TRUE then we will ALWAYS make the vault trade and if it errors our on OApp config the user can only retry and go ahead to the target chain since they have the target token.
        /// @dev If the composer is deployed with `OPTIMISTICALLY_CONVERT_TOKENS` set to FALSE then we will early exit and the user can only go back to the source chain as they have the source token.
        if (!OPTIMISTICALLY_CONVERT_TOKENS) {
            /// @dev This quoteSend catches issues like: invalid peer or dvn config, etc.
            try IOFT(oft).quoteSend(sendParam, false) {} catch {
                /// @dev When erroring out we want to NOT make a swap and the user can only go back to the source chain.
                failedMessages[_guid] = FailedMessage(address(0), _refundOFT, refundSendParam);
                return;
            }
        }

        try this.executeOVaultAction(_refundOFT, amount, sendParam.minAmountLD) {} catch {
            failedMessages[_guid] = FailedMessage(address(0), _refundOFT, refundSendParam);
            emit SlippageEncountered(amount, sendParam.minAmountLD);
            return;
        }

        /// @dev Try sending the message to the target OFT
        try this.send{ value: msg.value }(oft, sendParam) {
            emit Sent(_guid, oft);
        } catch {
            /// @dev A failed send can happen due to not enough msg.value
            /// @dev Since we have the target tokens in the composer, we can retry with more gas.
            failedMessages[_guid] = FailedMessage(oft, address(0), sendParam);
            emit SendFailed(_guid, oft);
            return;
        }
    }

    /// @dev External call for try...catch logic in lzCompose()
    function decodeSendParam(bytes calldata sendParamBytes) external pure returns (SendParam memory sendParam) {
        sendParam = abi.decode(sendParamBytes, (SendParam));
    }

    function executeOVaultAction(address _oft, uint256 _amount, uint256 _minAmountLD) external nonReentrant {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        uint256 vaultAmount;
        if (_oft == ASSET_OFT) {
            vaultAmount = IERC4626Adapter(OVAULT).deposit(_amount, address(this));
        } else {
            vaultAmount = IERC4626Adapter(OVAULT).redeem(_amount, address(this), address(this));
        }

        if (vaultAmount < _minAmountLD) {
            /// @dev Will rollback on this function's storage changes (trade does not happen)
            revert NotEnoughTargetTokens(vaultAmount, _minAmountLD);
        }
    }

    /// @dev External call for try...catch logic in lzCompose()
    function send(address _oft, SendParam memory _sendParam) external payable nonReentrant {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);
        _send(_oft, _sendParam);
    }

    /// @dev Permissionless function to send back the message to the source chain
    /// @dev Always possible unless the lzCompose() fails due to an Out-Of-Gas panic
    function refund(bytes32 _guid, bytes calldata _extraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        SendParam memory refundSendParam = failedMessage.sendParam;
        if (failedMessage.refundOFT == address(0)) revert InvalidSendParam(refundSendParam);

        refundSendParam.extraOptions = _extraOptions;

        delete failedMessages[_guid];
        _send(failedMessage.refundOFT, refundSendParam);
        emit Refunded(_guid, failedMessage.refundOFT);
    }

    /// @dev Permissionless function to retry the message with more gas
    /// @dev Probabilistically possible if the OFT.send() fails - ex: invalid peer
    function retry(bytes32 _guid, bytes calldata _extraOptions) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedMessage.oft == address(0)) revert InvalidSendParam(failedMessage.sendParam);

        SendParam memory sendParam = failedMessage.sendParam;

        sendParam.extraOptions = _extraOptions;

        delete failedMessages[_guid];
        _send(failedMessage.oft, sendParam);
        emit Retried(_guid, failedMessage.oft);
    }

    function _send(address _oft, SendParam memory _sendParam) internal {
        IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), tx.origin);
    }

    receive() external payable {}
}
