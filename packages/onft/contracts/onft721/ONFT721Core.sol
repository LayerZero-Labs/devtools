// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import { OApp, Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { IOAppMsgInspector } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppMsgInspector.sol";
import { OAppOptionsType3 } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";

import { OAppPreCrimeSimulator } from "@layerzerolabs/lz-evm-oapp-v2/contracts/precrime/OAppPreCrimeSimulator.sol";

import { IONFT721, MessagingFee, MessagingReceipt, SendParam } from "./interfaces/IONFT721.sol";
import { ONFT721MsgCodec } from "./libs/ONFT721MsgCodec.sol";
import { ONFTComposeMsgCodec } from "../libs/ONFTComposeMsgCodec.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ONFT721Core
/// @dev Abstract contract for an ONFT721 token.
abstract contract ONFT721Core is IONFT721, OApp, OAppPreCrimeSimulator, OAppOptionsType3 {
    using ONFT721MsgCodec for bytes;
    using ONFT721MsgCodec for bytes32;
    using ONFT721MsgCodec for uint256;
    using OptionsBuilder for bytes;

    // @notice Msg types that are used to identify the various OFT operations.
    // @dev This can be extended in child contracts for non-default oft operations
    // @dev These values are used in things like combineOptions() in OAppOptionsType3.sol.
    uint16 public constant SEND = 1;
    uint16 public constant SEND_AND_CALL = 2;

    // Address of an optional contract to inspect both 'message' and 'options'
    address public msgInspector;

    event MsgInspectorSet(address inspector);

    /// @param _lzEndpoint The address of the LayerZero endpoint.
    /// @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
    constructor(address _lzEndpoint, address _delegate) Ownable(_delegate) OApp(_lzEndpoint, _delegate) {}

    /// @notice Retrieves interfaceID and the version of the ONFT.
    /// @return interfaceId The interface ID (0x94642228).
    /// @return version The version.
    /// @dev version: Indicates a cross-chain compatible msg encoding with other ONFTs.
    /// @dev If a new feature is added to the ONFT cross-chain msg encoding, the version will be incremented.
    /// @dev ie. localONFT version(x,1) CAN send messages to remoteONFT version(x,1)
    function onftVersion() external pure virtual returns (bytes4 interfaceId, uint64 version) {
        return (type(IONFT721).interfaceId, 1);
    }

    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) external view virtual returns (MessagingFee memory msgFee) {
        if (_sendParam.tokenIds.length != 1) revert("ff");
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam);
        return _quote(_sendParam.dstEid, message, options, _payInLzToken);
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable virtual returns (MessagingReceipt memory msgReceipt) {
        if (_sendParam.tokenIds.length != 1) revert("ff");
        _debit(_sendParam.tokenIds[0], _sendParam.dstEid);

        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam);

        // @dev Sends the message to the LayerZero Endpoint, returning the MessagingReceipt.
        msgReceipt = _lzSend(_sendParam.dstEid, message, options, _fee, _refundAddress);
        emit ONFTSent(msgReceipt.guid, _sendParam.dstEid, msg.sender, _sendParam.tokenIds);
    }

    /// @dev Internal function to build the message and options.
    /// @param _sendParam The parameters for the send() operation.
    /// @return message The encoded message.
    /// @return options The encoded options.
    function _buildMsgAndOptions(
        SendParam calldata _sendParam
    ) internal view virtual returns (bytes memory message, bytes memory options) {
        bool hasCompose;
        (message, hasCompose) = ONFT721MsgCodec.encode(_sendParam.to, _sendParam.tokenIds[0], _sendParam.composeMsg);
        uint16 msgType = hasCompose ? SEND_AND_CALL : SEND;

        options = combineOptions(_sendParam.dstEid, msgType, _sendParam.extraOptions);

        // @dev Optionally inspect the message and options depending if the OApp owner has set a msg inspector.
        // @dev If it fails inspection, needs to revert in the implementation. ie. does not rely on return boolean
        if (msgInspector != address(0)) IOAppMsgInspector(msgInspector).inspect(message, options);
    }

    /// @dev Internal function to handle the receive on the LayerZero endpoint.
    /// @param _origin The origin information.
    ///  - srcEid: The source chain endpoint ID.
    ///  - sender: The sender address from the src chain.
    ///  - nonce: The nonce of the LayerZero message.
    /// @param _guid The unique identifier for the received LayerZero message.
    /// @param _message The encoded message.
    /// @dev _executor The address of the executor.
    /// @dev _extraData Additional data.
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/, // @dev unused in the default implementation.
        bytes calldata /*_extraData*/ // @dev unused in the default implementation.
    ) internal virtual override {
        address toAddress = _message.sendTo().bytes32ToAddress();
        uint256 tokenId = _message.tokenId();

        _credit(toAddress, tokenId, _origin.srcEid);

        if (_message.isComposed()) {
            bytes memory composeMsg = ONFTComposeMsgCodec.encode(_origin.nonce, _origin.srcEid, _message.composeMsg());
            endpoint.sendCompose(toAddress, _guid, 0 /* the index of composed message*/, composeMsg);
        }

        emit ONFTReceived(_guid, _origin.srcEid, toAddress, toSingletonArray(tokenId));
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

    /// @dev Check if the peer is considered 'trusted' by the OApp.
    /// @param _eid The endpoint ID to check.
    /// @param _peer The peer to check.
    /// @return Whether the peer passed is considered 'trusted' by the OApp.
    /// @dev Enables OAppPreCrimeSimulator to check whether a potential Inbound Packet is from a trusted source.
    function isPeer(uint32 _eid, bytes32 _peer) public view virtual override returns (bool) {
        return peers[_eid] == _peer;
    }

    /// @notice Sets the message inspector address for the OFT.
    /// @param _msgInspector The address of the message inspector.
    /// @dev This is an optional contract that can be used to inspect both 'message' and 'options'.
    /// @dev Set it to address(0) to disable it, or set it to a contract address to enable it.
    function setMsgInspector(address _msgInspector) public virtual onlyOwner {
        msgInspector = _msgInspector;
        emit MsgInspectorSet(_msgInspector);
    }

    function toSingletonArray(uint256 element) public pure returns (uint256[] memory array) {
        array = new uint256[](1);
        array[0] = element;
    }

    function _debit(uint256 _tokenId, uint32 /*_dstEid*/) internal virtual;

    function _credit(address _toAddress, uint256 _tokenId, uint32 /*_srcEid*/) internal virtual;
}
