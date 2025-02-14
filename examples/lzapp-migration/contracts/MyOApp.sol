// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// Import the ILayerZeroReceiver interface from LayerZero Protocol V2
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";

import { OApp, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { LzLib } from "@layerzerolabs/solidity-examples/contracts/lzApp/libs/LzLib.sol";

/**
 * @title MyOApp
 * @dev A simple LayerZero receiver contract that implements the ILayerZeroReceiver interface.
 *      It receives messages from other chains and emits an event upon receiving a message.
 */
contract MyOApp is OApp {
    using LzLib for bytes32;

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    // Event emitted when a message is received
    event MessageReceived(uint32 indexed srcEid, address indexed srcAddress, uint64 nonce, string message);

    function quote(
        uint32 _dstEid,
        string memory _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory) {
        return _quote(_dstEid, abi.encode(_message), _options, false);
    }

    // Sends a message from the source to destination chain.
    function sendMessage(uint32 _dstEid, string memory _message, bytes calldata _options) external payable {
        bytes memory _payload = abi.encode(_message); // Encodes message as bytes.
        _lzSend(
            _dstEid, // Destination chain's endpoint ID.
            _payload, // Encoded message payload being sent.
            _options, // Message execution options (e.g., gas to use on destination).
            MessagingFee(msg.value, 0), // Fee struct containing native gas and ZRO token.
            payable(msg.sender) // The refund address in case the send call reverts.
        );
    }

    /**
     * @dev Internal function to implement lzReceive logic without needing to copy the basic parameter validation.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*guid*/,
        bytes calldata _message,
        address /*guid*/,
        bytes calldata /*extraData*/
    ) internal override {
        // Decode the payload to extract the message
        string memory _data = abi.decode(_message, (string));

        // Emit an event with the received message
        emit MessageReceived(_origin.srcEid, _origin.sender.bytes32ToAddress(), _origin.nonce, _data);
    }
}
