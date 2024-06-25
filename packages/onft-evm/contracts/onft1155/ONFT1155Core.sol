// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { MessagingFee, MessagingReceipt, OApp, Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";

import { OAppOptionsType3 } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import { IOAppMsgInspector } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppMsgInspector.sol";

import { OAppPreCrimeSimulator } from "@layerzerolabs/lz-evm-oapp-v2/contracts/precrime/OAppPreCrimeSimulator.sol";

import { ONFT1155MsgCodec } from "./libs/ONFT1155MsgCodec.sol";
import { ONFTComposeMsgCodec } from "../libs/ONFTComposeMsgCodec.sol";
import { IONFT1155, SendParam } from "./interfaces/IONFT1155.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract ONFT1155Core is IONFT1155, OApp, OAppPreCrimeSimulator, OAppOptionsType3 {
    using ONFT1155MsgCodec for bytes;
    using ONFT1155MsgCodec for bytes32;

    address public msgInspector;
    event MsgInspectorSet(address inspector);

    /// @notice Msg types that are used to identify the various OFT operations.
    /// @dev This can be extended in child contracts for non-default oft operations
    /// @dev These values are used in combineOptions() and OAppOptionsType3.sol.
    uint16 public constant SEND = 1;
    uint16 public constant SEND_AND_COMPOSE = 2;

    constructor(address _lzEndpoint, address _delegate) Ownable(_delegate) OApp(_lzEndpoint, _delegate) {}

    /// @notice Retrieves interfaceID and the version of the ONFT.
    /// @return interfaceId The interface ID.
    /// @return version The version.
    /// @dev interfaceId: This specific interface ID is 'a72f5dd8'.
    /// @dev version: Indicates a cross-chain compatible msg encoding with other ONFTs.
    /// @dev If a new feature is added to the ONFT cross-chain msg encoding, the version will be incremented.
    /// ie. localONFT version(x,1) CAN send messages to remoteONFT version(x,1)
    function onftVersion() external pure virtual returns (bytes4 interfaceId, uint64 version) {
        return (type(IONFT1155).interfaceId, 1);
    }

    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view virtual returns (MessagingFee memory msgFee) {
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam);
        return _quote(_sendParam.dstEid, message, options, _payInLzToken);
    }

    /// @dev Internal function to build the message and options.
    /// @param _sendParam The parameters for the send() operation.
    /// @return message The encoded message.
    /// @return options The encoded options.
    function _buildMsgAndOptions(
        SendParam calldata _sendParam
    ) internal view virtual returns (bytes memory message, bytes memory options) {
        bool hasCompose;
        (message, hasCompose) = ONFT1155MsgCodec.encode(
            _sendParam.to,
            _sendParam.tokenIds,
            _sendParam.amounts,
            _sendParam.composeMessage
        );

        uint16 msgType = hasCompose ? SEND_AND_COMPOSE : SEND;
        // TODO: look at how gasLimit is done in StargateV2 for batch sending. First, profile gas as this might be a little different.
        options = combineOptions(_sendParam.dstEid, msgType, _sendParam.extraOptions);

        /// @dev Optionally inspect the message and options depending if the OApp owner has set a msg inspector.
        /// @dev If it fails inspection, needs to revert in the implementation. ie. does not rely on return boolean
        if (msgInspector != address(0)) IOAppMsgInspector(msgInspector).inspect(message, options);
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable virtual returns (MessagingReceipt memory msgReceipt) {
        // TODO checks on _sendParam
        _debit(_sendParam.tokenIds, _sendParam.amounts, _sendParam.dstEid);

        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam);

        // @dev Sends the message to the LayerZero endpoint and returns the LayerZero msg receipt.
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);
        //        emit ONFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, _sendParam.tokenIds);
    }

    /// @dev Sets the message inspector address for the OFT.
    /// @param _msgInspector The address of the message inspector.
    /// @dev This is an optional contract that can be used to inspect both 'message' and 'options'.
    /// @dev Set it to address(0) to disable it, or set it to a contract address to enable it.
    function setMsgInspector(address _msgInspector) public virtual onlyOwner {
        msgInspector = _msgInspector;
        emit MsgInspectorSet(_msgInspector);
    }

    function _debit(uint256[] memory _tokenIds, uint256[] memory amounts, uint32 /*_dstEid*/) internal virtual;

    function _credit(
        address _toAddress,
        uint256[] memory _tokenIds,
        uint256[] memory amounts,
        uint32 /*_srcEid*/
    ) internal virtual;

    /// @dev Check if the peer is considered 'trusted' by the OApp.
    /// @param _eid The endpoint ID to check.
    /// @param _peer The peer to check.
    /// @return Whether the peer passed is considered 'trusted' by the OApp.
    /// @dev Enables OAppPreCrimeSimulator to check whether a potential Inbound Packet is from a trusted source.
    function isPeer(uint32 _eid, bytes32 _peer) public view virtual override returns (bool) {
        return peers[_eid] == _peer;
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/, // @dev unused in the default implementation.
        bytes calldata /*_extraData*/ // @dev unused in the default implementation.
    ) internal virtual override {
        address toAddress = _message.sendTo().bytes32ToAddress();
        (uint256[] memory tokenIds, uint256[] memory amounts) = _message.tokens();
        _credit(toAddress, tokenIds, amounts, _origin.srcEid);
        if (_message.isComposed()) {
            bytes memory composeMsg = ONFTComposeMsgCodec.encode(_origin.nonce, _origin.srcEid, _message.composeMsg());
            endpoint.sendCompose(toAddress, _guid, 0 /* the index of composed message*/, composeMsg);
        }
        // TODO
        //        emit ONFTReceived(_guid, _origin.srcEid, toAddress, tokenIds);
    }

    /// @dev Internal function to handle the OAppPreCrimeSimulator simulated receive.
    /// @param _origin The origin information.
    ///  - srcEid: The source chain endpoint ID.
    ///  - sender: The sender address from the src chain.
    ///  - nonce: The nonce of the LayerZero message.
    /// @param _guid The unique identifier for the received LayerZero message.
    /// @param _message The LayerZero message.
    /// @param _executor The address of the off-chain executor.
    /// @param _extraData Arbitrary data passed by the msg executor.
    /// @dev Enables the preCrime simulator to mock sending lzReceive() messages,
    /// routes the msg down from the OAppPreCrimeSimulator, and back up to the OAppReceiver.
    function _lzReceiveSimulate(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal virtual override {
        _lzReceive(_origin, _guid, _message, _executor, _extraData);
    }
}
