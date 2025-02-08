// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// Import the ILayerZeroReceiver interface from LayerZero Protocol V2
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";

import { OApp, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

import { LzLib } from "@layerzerolabs/solidity-examples/contracts/lzApp/libs/LzLib.sol";

/**
 * @title MyOApp
 *
 * @notice This contract utilizes LayerZero V2's OApp to receive messages from other chains.
 *
 * @custom:warning Ensure that this contract interacts only with LayerZero V2 protocol contracts.
 *                Using contracts from other versions may lead to unexpected behavior or errors.
 *
 * @dev A simple Endpoint V2 application to send and receive string messages across chains.
 */
contract MyOApp is OApp {
    using LzLib for bytes32;

    /**
     * @notice Emitted when a message is received from another chain.
     *
     * @param srcEid The endpoint identifier of the source chain.
     * @param srcAddress The address from the source chain that sent the message.
     * @param nonce The unique nonce of the message.
     * @param message The string message that was received.
     */
    event MessageReceived(uint32 indexed srcEid, address indexed srcAddress, uint64 nonce, string message);

    /**
     * @notice Initializes the LayerZero endpoint and delegates ownership.
     *
     * @dev The constructor sets up the OApp with the provided endpoint and delegate, and initializes ownership.
     *
     * @param _endpoint The address of the LayerZero endpoint contract.
     * @param _delegate The address that will be granted ownership of the contract.
     *                  In the context of LayerZero V2, this address gains access control over
     *                  protocol-specific settings for the application, such as managing
     *                  message libraries and configuring messaging parameters.
     */
    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) {}

    /**
     * @notice Provides a quote for sending a message to a destination endpoint.
     *
     * @dev Calls the internal _quote function with encoded message and specified options.
     *
     * @param _dstEid The endpoint identifier of the destination chain.
     * @param _message The string message intended for the destination chain.
     * @param _options Additional options for message execution (e.g., gas limits, msg.value).
     *
     * @return fee The estimated messaging fee required to send the message.
     */
    function quote(
        uint32 _dstEid,
        string memory _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory) {
        return _quote(_dstEid, abi.encode(_message), _options, false);
    }

    /**
     * @notice Sends a string message to a specified destination endpoint.
     *
     * @dev Encodes the message and utilizes the internal _lzSend function to dispatch it.
     *
     * @param _dstEid The endpoint identifier of the destination chain.
     * @param _message The string message to be sent.
     * @param _options Additional options for message execution (e.g., gas limits).
     */
    function sendMessage(uint32 _dstEid, string memory _message, bytes calldata _options) external payable {
        bytes memory _payload = abi.encode(_message);
        _lzSend(
            _dstEid,
            _payload,
            _options,
            MessagingFee(msg.value, 0), // Fee struct containing native gas and ZRO token.
            payable(msg.sender) // The refund address in case the send call reverts.
        );
    }

    /**
     * @dev Handles the receipt of a message from another chain.
     *      Decodes the incoming payload and emits a MessageReceived event.
     *
     * @param _origin The origin information of the incoming message.
     * @param _message The encoded message payload received.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*guid*/,
        bytes calldata _message,
        address /*executor*/,
        bytes calldata /*extraData*/
    ) internal override {
        // Decode the payload to extract the message
        string memory _data = abi.decode(_message, (string));

        // Emit an event with the received message
        emit MessageReceived(_origin.srcEid, _origin.sender.bytes32ToAddress(), _origin.nonce, _data);
    }
}
