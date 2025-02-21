// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  Internal imports    ==========

import { MessageType, Call, Transfer } from "./OmniCall.sol";

/// -----------------------------------------------------------------------
/// Library
/// -----------------------------------------------------------------------

/**
 * @title OmniCallMsgCodecLib
 * @author LayerZero Labs
 * @notice This library provides functions to encode and decode messages for the OmniCall.
 */
library OmniCallMsgCodecLib {
    /// -----------------------------------------------------------------------
    /// Custom errors
    /// -----------------------------------------------------------------------

    /// @dev Error for when an invalid message type is passed as a parameter.
    error LZ_OmniCallMsgCodecLib__InvalidMessageType();

    /**
     * @dev Error for when an invalid data length is passed as a parameter.
     * @param length: The length of the data.
     */
    error LZ_OmniCallMsgCodecLib__InvalidDataLength(uint256 length);

    /// -----------------------------------------------------------------------
    /// Constants
    /// -----------------------------------------------------------------------

    uint8 internal constant CALL_TYPE = 1;
    uint8 internal constant CALL_AND_TRANSFER_TYPE = 2;
    uint256 internal constant MINIMAL_LENGTH_CALL = 36;
    uint256 internal constant MINIMAL_LENGTH_CALL_AND_TRANSFER = 72;

    /// -----------------------------------------------------------------------
    /// Functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Encodes a message for the OmniCall.
     * @param messageType The type of message to encode.
     * @param dstCall The destination call of the message.
     * @param dstTransfer The destination transfer of the message.
     * @return - bytes - The encoded message.
     */
    function encode(
        MessageType messageType,
        Call calldata dstCall,
        Transfer calldata dstTransfer
    ) internal pure returns (bytes memory) {
        uint8 messageTypeUint = messageType == MessageType.ATOMIC && dstTransfer.value > 0
            ? uint8(messageType) + 1
            : uint8(messageType);
        if (messageTypeUint == CALL_TYPE) {
            return abi.encodePacked(messageTypeUint, dstCall.target, dstCall.value, dstCall.callData);
        } else if (messageTypeUint == CALL_AND_TRANSFER_TYPE) {
            return
                abi.encodePacked(
                    messageTypeUint,
                    dstTransfer.to,
                    dstTransfer.value,
                    dstCall.target,
                    dstCall.value,
                    dstCall.callData
                );
        }

        return bytes("");
    }

    /**
     * @notice Decodes a message for the OmniCall.
     * @dev Reverts if:
     * - The message type is invalid (i.e. not CALL or CALL_AND_TRANSFER).
     * - The data length is invalid.
     * @param data The encoded message.
     * @return to - address - The destination address for the message.
     * @return transferValue - uint128 - The value to send with the message.
     * @return target - address - The destination address for the message.
     * @return value - uint128 - The value to send with the message.
     * @return callData - bytes - The encoded call of the message.
     */
    function decode(
        bytes calldata data
    ) internal pure returns (address to, uint128 transferValue, address target, uint128 value, bytes memory callData) {
        uint8 messageType = uint8(data[0]);
        if (messageType == CALL_TYPE) {
            require(!(data.length < MINIMAL_LENGTH_CALL), LZ_OmniCallMsgCodecLib__InvalidDataLength(data.length));

            target = address(uint160(bytes20(data[1:21])));
            value = uint128(bytes16(data[21:37]));
            callData = data[37:];
        } else if (messageType == CALL_AND_TRANSFER_TYPE) {
            require(
                !(data.length < MINIMAL_LENGTH_CALL_AND_TRANSFER),
                LZ_OmniCallMsgCodecLib__InvalidDataLength(data.length)
            );

            to = address(uint160(bytes20(data[1:21])));
            transferValue = uint128(bytes16(data[21:37]));
            target = address(uint160(bytes20(data[37:57])));
            value = uint128(bytes16(data[57:73]));
            callData = data[73:];
        } else {
            revert LZ_OmniCallMsgCodecLib__InvalidMessageType();
        }
    }

    /**
     * @notice Checks if the message type is a call type.
     * @param data The encoded message.
     * @return - bool - True if the message type is a call type, false otherwise.
     */
    function isCallType(bytes calldata data) internal pure returns (bool) {
        return uint8(data[0]) == CALL_TYPE && !(data.length < MINIMAL_LENGTH_CALL);
    }

    /**
     * @notice Checks if the message type is a call and transfer type.
     * @param data The encoded message.
     * @return - bool - True if the message type is a call and transfer type, false otherwise.
     */
    function isCallAndTransferType(bytes calldata data) internal pure returns (bool) {
        return uint8(data[0]) == CALL_AND_TRANSFER_TYPE && !(data.length < MINIMAL_LENGTH_CALL_AND_TRANSFER);
    }
}
