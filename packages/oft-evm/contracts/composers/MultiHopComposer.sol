// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";

import { IOFT, SendParam, MessagingFee } from "../interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "../libs/OFTComposeMsgCodec.sol";
import { IMultiHopComposer, FailedMessage } from "../interfaces/IMultiHopComposer.sol";

contract MultiHopComposer is IMultiHopComposer, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;

    /// @dev OFTAdapter address.
    address public immutable ADAPTER_MESH;
    /// @dev OFT or MintBurnOFTAdapter address.
    address public immutable OFT_MESH;
    address public immutable ENDPOINT;

    address public immutable EXECUTOR;

    /// @notice There are 3 states a failed message can be in:
    /// @notice 1. Failed upon entering the composer - FailedMessage.oft == address(0) && FailedMessage.refundOFT == address(0)
    /// @notice 2. Failed to decode the message - FailedMessage.oft == address(0) && FailedMessage.refundOFT != address(0)
    /// @notice 3. Failed to send the message to the target OFT - FailedMessage.oft != address(0) && FailedMessage.refundOFT != address(0)
    ///
    /// @dev State 1 needs lzCompose() to be re-executed
    /// @dev State 2 can only be refunded back to the source chain
    /// @dev State 3 can be refunded back to the source chain or retried with more gas
    mapping(bytes32 guid => FailedMessage) public failedMessages;

    constructor(address _ADAPTER_MESH, address _OFT_MESH, address _EXECUTOR) {
        ADAPTER_MESH = _ADAPTER_MESH;
        OFT_MESH = _OFT_MESH;
        ENDPOINT = address(IOAppCore(_ADAPTER_MESH).endpoint());
        EXECUTOR = _EXECUTOR;

        if (!IOFT(ADAPTER_MESH).approvalRequired()) {
            revert InvalidAdapterMesh();
        }

        if (IOFT(OFT_MESH).approvalRequired()) {
            revert InvalidOFTMesh();
        }

        // Approve the adapter to spend the OFT tokens held by this contract
        IERC20(IOFT(ADAPTER_MESH).token()).approve(ADAPTER_MESH, type(uint256).max);
    }

    /// @notice This Composer only supports cross-mesh transfers between the AdapterMesh and OFTMesh with failed transaction logic
    function lzCompose(
        address _refundOFT,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        if (msg.sender != ENDPOINT) revert OnlyEndpoint(msg.sender);
        if (_refundOFT != ADAPTER_MESH && _refundOFT != OFT_MESH) revert OnlyOFT(_refundOFT);

        /// @dev Route to the correct target OFT
        address oft = _refundOFT == ADAPTER_MESH ? OFT_MESH : ADAPTER_MESH;

        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        uint32 srcEid = OFTComposeMsgCodec.srcEid(_message);
        uint256 amount = OFTComposeMsgCodec.amountLD(_message);
        bytes32 srcSender = OFTComposeMsgCodec.composeFrom(_message);
        bytes memory sendParamEncoded = OFTComposeMsgCodec.composeMsg(_message);

        SendParam memory refundSendParam;
        refundSendParam.dstEid = srcEid;
        refundSendParam.to = srcSender;
        refundSendParam.amountLD = amount;

        SendParam memory sendParam;

        /// @dev Try decoding the composeMsg as a SendParam
        try this.decodeSendParam(sendParamEncoded) returns (SendParam memory sendParamDecoded) {
            /// @dev In the case of a valid decode we have the raw SendParam to be forwarded to the target OFT (oft)
            sendParam = sendParamDecoded;
            /// @notice amountLD in sendParam may not equal the tokens transferred into the composer.
            /// @dev When sendParam.amountLD > amount, the composer is exploitable as tokens locked in the composer from failed transactions can be sent.
            /// @dev This override will always set the amountLD to the amount of tokens transferred into the composer from the OFT.
            sendParam.amountLD = amount;
            /// @notice LayerZero transfers do not have slippage as there are no token conversions.
            /// @dev We set minAmountLD as 0 as the AdapterMesh charges a Fee per transaction which is computed in the OFT.
            sendParam.minAmountLD = 0;
        } catch {
            /// @dev In the case of a failed decode we store the failed message and emit an event.
            /// @dev This message can only be refunded back to the source chain.
            failedMessages[_guid] = FailedMessage(address(0), sendParam, _refundOFT, refundSendParam, msg.value);
            emit DecodeFailed(_guid, oft, sendParamEncoded);
            return;
        }

        /// @dev Try sending the message to the target OFT
        try this.send{ value: msg.value }(oft, sendParam) {
            emit Sent(_guid, oft);
        } catch {
            /// @dev A failed send can happen due to several reasons - not enough msg.value, invalid peer, etc.
            /// @dev This message can only be refunded back to the source chain or retried with more gas.
            failedMessages[_guid] = FailedMessage(oft, sendParam, _refundOFT, refundSendParam, msg.value);
            emit SendFailed(_guid, oft);
            return;
        }
    }

    /// @dev External call for try...catch logic in lzCompose()
    function decodeSendParam(bytes calldata sendParamBytes) external pure returns (SendParam memory sendParam) {
        sendParam = abi.decode(sendParamBytes, (SendParam));
    }

    /// @dev External call for try...catch logic in lzCompose()
    function send(address _oft, SendParam memory _sendParam) external payable nonReentrant {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);
        _send(_oft, _sendParam, 0, tx.origin);
    }

    /// @dev Permissionless function to send back the message to the source chain
    /// @dev Always possible unless the lzCompose() fails due to an Out-Of-Gas panic
    /// @dev The msg.value cached in the failedMessage is refunded to the EXECUTOR
    /// @notice extraOptions are not used, as cached msg.value could be MEV-ed on all failed transactions via nativeDrop in extraOptions to the MEV address
    function refund(bytes32 _guid) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedMessage.refundOFT == address(0)) revert InvalidSendParam(failedMessage.refundSendParam);

        delete failedMessages[_guid];
        _send(failedMessage.refundOFT, failedMessage.refundSendParam, failedMessage.msgValue, EXECUTOR);
        emit Refunded(_guid, failedMessage.refundOFT);
    }

    /// @dev Permissionless function to retry the message with more gas
    /// @dev Probabilistically possible if the OFT.send() fails - ex: invalid peer
    /// @dev The msg.value cached in the failedMessage is refunded to the tx.origin
    /// @notice extraOptions are not used, as cached msg.value could be MEV-ed on all failed transactions via nativeDrop in extraOptions to the MEV address
    /// @notice Failed messages due to invalid option states MUST be refunded
    function retry(bytes32 _guid) external payable nonReentrant {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedMessage.oft == address(0)) revert InvalidSendParam(failedMessage.sendParam);

        delete failedMessages[_guid];
        _send(failedMessage.oft, failedMessage.sendParam, failedMessage.msgValue, tx.origin);
        emit Retried(_guid, failedMessage.oft);
    }

    function _send(address _oft, SendParam memory _sendParam, uint256 _prePaidValue, address _refundTo) internal {
        uint256 msgValue = msg.value + _prePaidValue;
        IOFT(_oft).send{ value: msgValue }(_sendParam, MessagingFee(msgValue, 0), _refundTo);
    }

    receive() external payable {}
}
