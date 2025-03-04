// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// Import the abstract NonblockingLzApp contract
import { NonblockingLzApp } from "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { LzLib } from "@layerzerolabs/solidity-examples/contracts/lzApp/libs/LzLib.sol";

/**
 * @title MyLzApp
 * @dev A simple LayerZero application to send and receive string messages across chains.
 */
contract MyLzApp is NonblockingLzApp {
    using LzLib for bytes32;
    // Event emitted when a message is received
    event MessageReceived(uint16 indexed srcChainId, address srcAddress, uint64 nonce, string message);

    /**
     * @dev Constructor initializes the LzApp with the LayerZero endpoint.
     * @param _endpoint Address of the LayerZero endpoint contract.
     */
    constructor(address _endpoint, address _owner) NonblockingLzApp(_endpoint) Ownable(_owner) {}

    function estimateFee(
        uint16 _dstChainId,
        string memory _message,
        bool _useZro,
        bytes calldata _adapterParams
    ) public view returns (uint256 nativeFee, uint256 zroFee) {
        return lzEndpoint.estimateFees(_dstChainId, address(this), abi.encode(_message), _useZro, _adapterParams);
    }

    /**
     * @dev Sends a string message to a specified destination chain and address.
     * @param _dstChainId The destination chain identifier.
     * @param _message The string message to send.
     * @param _adapterParams Additional adapter parameters.
     */
    function sendMessage(uint16 _dstChainId, string calldata _message, bytes calldata _adapterParams) external payable {
        bytes memory _payload = abi.encode(_message);
        _lzSend(_dstChainId, _payload, payable(msg.sender), payable(msg.sender), _adapterParams, msg.value);
    }

    /**
     * @dev Overrides the _nonblockingLzReceive function from NonblockingLzApp.
     *      Decodes the incoming payload and emits a MessageReceived event.
     * @param _srcChainId The source chain identifier.
     * @param _nonce The message nonce.
     * @param _payload The payload containing the string message.
     */
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        // Decode the payload to extract the message
        string memory message = abi.decode(_payload, (string));
        bytes32 srcAddress = bytes32(_srcAddress);

        // Emit an event with the received message
        emit MessageReceived(_srcChainId, srcAddress.bytes32ToAddress(), _nonce, message);
    }
}
