// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { StringMsgCodec } from "./libs/StringMsgCodec.sol";

contract MyOApp is OApp, OAppOptionsType3 {
    using StringMsgCodec for bytes;

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    string public data = "Nothing received yet.";

    /**
     * @notice Sends a message from the source chain to a destination chain.
     * @param _dstEid The endpoint ID of the destination chain.
     * @param _message The message string to be sent.
     * @param _composeMsg Extra “compose” bytes appended after the string.
     * @param _options Additional options for message execution.
     * @dev Encodes the message as bytes and sends it using the `_lzSend` internal function.
     * @return receipt A `MessagingReceipt` struct containing details of the message sent.
     */
    function send(
        uint32 _dstEid,
        string calldata _message,
        bytes calldata _composeMsg,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory _payload = abi.encodePacked(
            abi.encode(uint256(bytes(_message).length)),
            bytes(_message),
            _composeMsg
        );
        uint8 msgType = _composeMsg.length > 0 ? StringMsgCodec.COMPOSED_TYPE : StringMsgCodec.VANILLA_TYPE;
        bytes memory options = combineOptions(_dstEid, msgType, _options);
        receipt = _lzSend(_dstEid, _payload, options, MessagingFee(msg.value, 0), payable(msg.sender));
    }

    /**
     * @notice Quotes the gas needed to pay for the full omnichain transaction in native gas or ZRO token.
     * @param _dstEid Destination chain's endpoint ID.
     * @param _message The message.
     * @param _options Message execution options (e.g., for sending gas to destination).
     * @param _payInLzToken Whether to return fee in ZRO token.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
    function quote(
        uint32 _dstEid,
        string calldata _message,
        bytes calldata _composeMsg,
        bytes calldata _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encodePacked(
            abi.encode(uint256(bytes(_message).length)),
            bytes(_message),
            _composeMsg
        );
        uint8 msgType = _composeMsg.length > 0 ? StringMsgCodec.COMPOSED_TYPE : StringMsgCodec.VANILLA_TYPE;
        bytes memory options = combineOptions(_dstEid, msgType, _options);
        fee = _quote(_dstEid, payload, options, _payInLzToken);
    }

    /**
     * @dev Internal function override to handle incoming messages from another chain.
     * @dev _origin A struct containing information about the message sender.
     * @dev _guid A unique global packet identifier for the message.
     * @param payload The encoded message payload being received.
     *
     * @dev The following params are unused in the current implementation of the OApp.
     * @dev _executor The address of the Executor responsible for processing the message.
     * @dev _extraData Arbitrary data appended by the Executor to the message.
     *
     * Decodes the received payload and processes it as per the business logic defined in the function.
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        (string memory stringValue, ) = StringMsgCodec.decode(payload);
        data = stringValue;
        // TODO: process _composeMsg
    }
}
