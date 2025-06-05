// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Custom types
/// -----------------------------------------------------------------------

/**
 * @dev Struct to represent a call.
 * @param target: call target address;
 * @param value: value to be sent with the call;
 * @param callData: call calldata.
 */
struct Call {
    address target;
    uint128 value;
    bytes callData;
}

/**
 * @dev Struct to represent a transfer.
 * @param to: transfer destination address;
 * @param value: value to be sent with the transfer.
 */
struct Transfer {
    address to;
    uint128 value;
}

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
     * @param messageType: The type of message.
     * @param length: The length of the data.
     */
    error LZ_OmniCallMsgCodecLib__InvalidDataLength(uint8 messageType, uint256 length);

    /// -----------------------------------------------------------------------
    /// Constants
    /// -----------------------------------------------------------------------

    uint8 internal constant TRANSFER_TYPE = 0; // Non-atomic
    uint8 internal constant CALL_TYPE = 1; // Non-atomic
    uint8 internal constant CALL_AND_TRANSFER_TYPE = 2; // Atomic
    uint8 internal constant MAX_MESSAGE_TYPE_VALUE = 2;
    uint256 internal constant MINIMAL_LENGTH_CALL = 36;
    uint256 internal constant MINIMAL_LENGTH_CALL_AND_TRANSFER = 72;

    uint8 internal constant FIRST_ADDRESS_START_INDEX = 1;
    uint8 internal constant FIRST_ADDRESS_END_INDEX = 21;
    uint8 internal constant FIRST_VALUE_END_INDEX = 37;
    uint8 internal constant SECOND_ADDRESS_END_INDEX = 57;
    uint8 internal constant SECOND_VALUE_END_INDEX = 73;

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
        uint8 messageType,
        Call calldata dstCall,
        Transfer calldata dstTransfer
    ) internal pure returns (bytes memory) {
        if (messageType >= MAX_MESSAGE_TYPE_VALUE) {
            revert LZ_OmniCallMsgCodecLib__InvalidMessageType();
        }

        uint8 messageTypeUint = (messageType == TRANSFER_TYPE && dstCall.callData.length > 0) ||
            (messageType == CALL_TYPE && dstTransfer.value > 0)
            ? messageType + 1
            : messageType;
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
            if (data.length < MINIMAL_LENGTH_CALL) {
                revert LZ_OmniCallMsgCodecLib__InvalidDataLength(messageType, data.length);
            }

            target = address(uint160(bytes20(data[FIRST_ADDRESS_START_INDEX:FIRST_ADDRESS_END_INDEX])));
            value = uint128(bytes16(data[FIRST_ADDRESS_END_INDEX:FIRST_VALUE_END_INDEX]));
            callData = data[FIRST_VALUE_END_INDEX:];
        } else if (messageType == CALL_AND_TRANSFER_TYPE) {
            if (data.length < MINIMAL_LENGTH_CALL_AND_TRANSFER) {
                revert LZ_OmniCallMsgCodecLib__InvalidDataLength(messageType, data.length);
            }

            to = address(uint160(bytes20(data[FIRST_ADDRESS_START_INDEX:FIRST_ADDRESS_END_INDEX])));
            transferValue = uint128(bytes16(data[FIRST_ADDRESS_END_INDEX:FIRST_VALUE_END_INDEX]));
            target = address(uint160(bytes20(data[FIRST_VALUE_END_INDEX:SECOND_ADDRESS_END_INDEX])));
            value = uint128(bytes16(data[SECOND_ADDRESS_END_INDEX:SECOND_VALUE_END_INDEX]));
            callData = data[SECOND_VALUE_END_INDEX:];
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
        return uint8(data[0]) == CALL_TYPE && data.length >= MINIMAL_LENGTH_CALL;
    }

    /**
     * @notice Checks if the message type is a call and transfer type.
     * @param data The encoded message.
     * @return - bool - True if the message type is a call and transfer type, false otherwise.
     */
    function isCallAndTransferType(bytes calldata data) internal pure returns (bool) {
        return uint8(data[0]) == CALL_AND_TRANSFER_TYPE && data.length >= MINIMAL_LENGTH_CALL_AND_TRANSFER;
    }
}
