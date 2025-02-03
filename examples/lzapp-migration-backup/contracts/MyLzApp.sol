// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// Import the abstract NonblockingLzApp contract
import { NonblockingLzApp } from "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { LzLib } from "@layerzerolabs/solidity-examples/contracts/lzApp/libs/LzLib.sol";

/**
 * @title MyLzApp
 *
 * @notice This contract utilizes LayerZero V1's NonblockingLzApp to facilitate cross-chain messaging.
 *
 * @custom:warning This contract can only be used with LayerZero V1 protocol contracts. Using Endpoint V2
 *                    will result in errors.
 *
 * @dev A simple LayerZero Endpoint V1 application to send and receive string messages across chains.
 */
contract MyLzApp is NonblockingLzApp {
    using LzLib for bytes32;
    /**
     * @notice Emitted when a message is received from another chain.
     *
     * @param srcChainId The LayerZero identifier of the source chain (endpoint id).
     * @param srcAddress The address from the source chain that sent the message.
     * @param nonce The unique nonce of the message.
     * @param message The string message that was received.
     */
    event MessageReceived(uint16 indexed srcChainId, address srcAddress, uint64 nonce, string message);

    /**
     * @dev Constructor initializes the LzApp with the LayerZero V1 endpoint address.
     *
     * @param _endpoint Address of the LayerZero V1 endpoint contract.
     * @param _owner The address that will be granted ownership of the contract.
     */
    constructor(address _endpoint, address _owner) NonblockingLzApp(_endpoint) Ownable(_owner) {}

    /**
     * @notice Estimates the fees required to send a message to a destination chain.
     *
     * @dev Calls the LayerZero V1 endpoint to calculate the native and ZRO token fees based on the provided parameters.
     *
     * @param _dstChainId The identifier of the destination chain.
     * @param _message The string message intended for the destination chain.
     * @param _useZro A boolean indicating whether ZRO tokens are used to pay for fees.
     * @param _adapterParams Encoded gas limit and additional parameters for the LayerZero message on destination.
     *
     * @return nativeFee The estimated fee in native tokens.
     * @return zroFee The estimated fee in ZRO tokens.
     */
    function estimateFee(
        uint16 _dstChainId,
        string memory _message,
        bool _useZro,
        bytes calldata _adapterParams
    ) public view returns (uint256 nativeFee, uint256 zroFee) {
        return lzEndpoint.estimateFees(_dstChainId, address(this), abi.encode(_message), _useZro, _adapterParams);
    }

    /**
     * @notice Sends a string message to a specified destination chain.
     *
     * @dev Encodes the message and utilizes the internal _lzSend function to dispatch it.
     *
     * @param _dstChainId The identifier of the destination chain.
     * @param _message The string message to be sent.
     * @param _adapterParams Additional parameters for the LayerZero adapter.
     */
    function sendMessage(uint16 _dstChainId, string calldata _message, bytes calldata _adapterParams) external payable {
        bytes memory _payload = abi.encode(_message);
        _lzSend(_dstChainId, _payload, payable(msg.sender), payable(msg.sender), _adapterParams, msg.value);
    }

    /**
     * @dev Overrides the _nonblockingLzReceive function from NonblockingLzApp.
     *      Decodes the incoming payload and emits a MessageReceived event.
     *
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
