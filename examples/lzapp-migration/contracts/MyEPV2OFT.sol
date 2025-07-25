// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { BytesLib } from "solidity-bytes-utils/contracts/BytesLib.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppReceiver.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppMsgInspector } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppMsgInspector.sol";

contract MyEPV2OFT is OFT {
    using BytesLib for bytes;
    using OFTMsgCodec for bytes;
    using OFTMsgCodec for bytes32;

    // V1 packet types
    uint8 public constant PT_SEND = 0;
    uint8 public constant PT_SEND_AND_CALL = 1;

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) {}

    /**
     * @dev Override to handle V1 message encoding when sending to V1 endpoints.
     * V1 endpoints are identified by dstEid 3xx (mainnet) or 10xxx (testnet).
     */
    function _buildMsgAndOptions(
        SendParam calldata _sendParam,
        uint256 _amountLD
    ) internal view virtual override returns (bytes memory message, bytes memory options) {
        // Check if destination is a V1 endpoint
        bool isV1Endpoint = (_sendParam.dstEid > 100 && _sendParam.dstEid < 1000) || // V1 mainnet (e.g., 101 = Ethereum)
            (_sendParam.dstEid > 10000 && _sendParam.dstEid < 20000); // V1 testnet (e.g., 10001 = Goerli)

        if (isV1Endpoint) {
            // Build V1 format message
            uint64 amountSD = _toSD(_amountLD);

            if (_sendParam.composeMsg.length > 0) {
                // V1 PT_SEND_AND_CALL format
                // [packetType(1)][toAddress(32)][amountSD(8)][from(32)][dstGasForCall(8)][payload]
                // Note: We need to extract gas from extraOptions if provided
                uint64 dstGasForCall = 200000; // Default gas, could parse from extraOptions

                message = abi.encodePacked(
                    PT_SEND_AND_CALL,
                    _sendParam.to, // Already bytes32
                    amountSD,
                    bytes32(uint256(uint160(msg.sender))), // from address
                    dstGasForCall,
                    _sendParam.composeMsg
                );
            } else {
                // V1 PT_SEND format
                // [packetType(1)][toAddress(32)][amountSD(8)]
                message = abi.encodePacked(
                    PT_SEND,
                    _sendParam.to, // Already bytes32
                    amountSD
                );
            }

            // For V1, we still use the V2 options format as those are handled by the messaging layer
            uint16 msgType = _sendParam.composeMsg.length > 0 ? SEND_AND_CALL : SEND;
            options = combineOptions(_sendParam.dstEid, msgType, _sendParam.extraOptions);

            // Inspect if configured
            address inspector = msgInspector;
            if (inspector != address(0)) IOAppMsgInspector(inspector).inspect(message, options);
        } else {
            // V2 endpoint - use default implementation
            return super._buildMsgAndOptions(_sendParam, _amountLD);
        }
    }

    /**
     * @dev Internal function to handle the receive on the LayerZero endpoint.
     * @param _origin The origin information.
     *  - srcEid: The source chain endpoint ID.
     *  - sender: The sender address from the src chain.
     *  - nonce: The nonce of the LayerZero message.
     * @param _guid The unique identifier for the received LayerZero message.
     * @param _message The encoded message.
     * @dev _executor The address of the executor.
     * @dev _extraData Additional data.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/, // @dev unused in the default implementation.
        bytes calldata /*_extraData*/ // @dev unused in the default implementation.
    ) internal virtual override {
        // Check if it's a V1 message by examining the message length and structure
        // V1 PT_SEND messages are exactly 41 bytes (1 + 32 + 8)
        // V1 PT_SEND_AND_CALL messages are at least 81 bytes (1 + 32 + 8 + 32 + 8 + payload)
        // V2 messages are 40 bytes (no compose) or 72+ bytes (with compose)

        bool isV1Message = false;

        if (_message.length == 41) {
            isV1Message = uint8(_message[0]) == PT_SEND;
        } else if (_message.length >= 81) {
            isV1Message = uint8(_message[0]) == PT_SEND_AND_CALL;
        }

        if (isV1Message) {
            _handleV1Message(_origin, _guid, _message);
        } else {
            // This is a V2 message - process normally
            _handleV2Message(_origin, _guid, _message);
        }
    }

    function _handleV1Message(Origin calldata _origin, bytes32 _guid, bytes calldata _message) internal {
        uint8 packetType = _message.toUint8(0);

        if (packetType == PT_SEND) {
            // Decode PT_SEND: [packetType(1)][toAddress(32)][amountSD(8)]
            address toAddress = _message.toAddress(13); // skip first byte, then next 12 bytes of padding
            uint64 amountSD = _message.toUint64(33);

            // Convert SD to LD and credit the recipient
            uint256 amountReceivedLD = _credit(toAddress, _toLD(amountSD), _origin.srcEid);

            emit OFTReceived(_guid, _origin.srcEid, toAddress, amountReceivedLD);
        } else if (packetType == PT_SEND_AND_CALL) {
            // Decode PT_SEND_AND_CALL: [packetType(1)][toAddress(32)][amountSD(8)][from(32)][dstGasForCall(8)][payload]
            address toAddress = _message.toAddress(13); // skip first byte, then next 12 bytes of padding
            uint64 amountSD = _message.toUint64(33);
            bytes32 from = _message.toBytes32(41);
            // dstGasForCall is at position 73 but we don't need it for V2
            bytes memory payload = _message.slice(81, _message.length - 81);

            // Convert SD to LD and credit the recipient
            uint256 amountReceivedLD = _credit(toAddress, _toLD(amountSD), _origin.srcEid);

            // Compose the message in V2 format
            bytes memory composeMsg = OFTComposeMsgCodec.encode(
                _origin.nonce,
                _origin.srcEid,
                amountReceivedLD,
                abi.encodePacked(from, payload) // Combine from address and payload
            );

            // @dev Stores the lzCompose payload that will be executed in a separate tx.
            // Standardizes functionality for executing arbitrary contract invocation on some non-evm chains.
            // @dev The off-chain executor will listen and process the msg based on the src-chain-callers compose options passed.
            // @dev The index is used when a OApp needs to compose multiple msgs on lzReceive.
            // For default OFT implementation there is only 1 compose msg per lzReceive, thus its always 0.
            endpoint.sendCompose(toAddress, _guid, 0, composeMsg);

            emit OFTReceived(_guid, _origin.srcEid, toAddress, amountReceivedLD);
        } else {
            revert("OFT: unknown V1 packet type");
        }
    }

    function _handleV2Message(Origin calldata _origin, bytes32 _guid, bytes calldata _message) internal {
        // @dev The src sending chain doesnt know the address length on this chain (potentially non-evm)
        // Thus everything is bytes32() encoded in flight.
        address toAddress = _message.sendTo().bytes32ToAddress();
        // @dev Credit the amountLD to the recipient and return the ACTUAL amount the recipient received in local decimals
        uint256 amountReceivedLD = _credit(toAddress, _toLD(_message.amountSD()), _origin.srcEid);

        if (_message.isComposed()) {
            // @dev Proprietary composeMsg format for the OFT.
            bytes memory composeMsg = OFTComposeMsgCodec.encode(
                _origin.nonce,
                _origin.srcEid,
                amountReceivedLD,
                _message.composeMsg()
            );

            // @dev Stores the lzCompose payload that will be executed in a separate tx.
            // Standardizes functionality for executing arbitrary contract invocation on some non-evm chains.
            // @dev The off-chain executor will listen and process the msg based on the src-chain-callers compose options passed.
            // @dev The index is used when a OApp needs to compose multiple msgs on lzReceive.
            // For default OFT implementation there is only 1 compose msg per lzReceive, thus its always 0.
            endpoint.sendCompose(toAddress, _guid, 0 /* the index of the composed message*/, composeMsg);
        }

        emit OFTReceived(_guid, _origin.srcEid, toAddress, amountReceivedLD);
    }
}
