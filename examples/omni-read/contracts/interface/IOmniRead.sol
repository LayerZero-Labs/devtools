// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

/// -----------------------------------------------------------------------
/// Interface
/// -----------------------------------------------------------------------

/**
 * @title OmniRead interface
 * @author LayerZero Labs (@EWCunha)
 */
interface IOmniRead {
    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    /// @dev The channel ID is invalid.
    error OmniRead__InvalidChannelId();

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    /**
     * @notice Emitted when a read request is sent.
     * @param caller The address of the caller.
     * @param identifier The identifier of the read request. Useful for multiple read requests in the same block.
     * @param guid The GUID of the read request.
     */
    event ReadRequestSent(address indexed caller, bytes32 indexed identifier, bytes32 guid);

    /**
     * @notice Emitted when a read request is received.
     * @param guid The GUID of the read request.
     */
    event ReadRequestReceived(bytes32 indexed guid);

    /// -----------------------------------------------------------------------
    /// Custom Types
    /// -----------------------------------------------------------------------

    /**
     * @notice A struct representing a read request.
     * @param targetEid The target EID.
     * @param isBlockNum Whether the block number is used.
     * @param blockNumOrTimestamp The block number or timestamp.
     * @param confirmations The number of confirmations.
     * @param to The address of the target contract.
     * @param callData The call data.
     */
    struct OmniReadRequest {
        uint32 targetEid;
        bool isBlockNum;
        uint64 blockNumOrTimestamp;
        uint16 confirmations;
        address to;
        bytes callData;
    }

    /// -----------------------------------------------------------------------
    /// Write public/external functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Sends a read request to the LayerZero endpoint.
     * @param readRequest: The read request.
     * @param readGasLimit: The gas limit for the read request.
     * @param returnDataSize: The size of the return data for the read request.
     * @param msgValue: The value of the read request.
     * @param identifier: The identifier of the read request. Useful for multiple read requests in the same block.
     * @return - MessagingReceipt - The receipt of the read request.
     */
    function readSingle(
        OmniReadRequest calldata readRequest,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue,
        bytes32 identifier
    ) external payable returns (MessagingReceipt memory);

    /**
     * @notice Sends a batch of read requests to the LayerZero endpoint.
     * @param readRequests: Array of read requests.
     * @param readGasLimit: The gas limit for the read requests.
     * @param returnDataSize: The size of the return data for the read requests.
     * @param msgValue: The value of the read requests.
     * @param identifier: The identifier of the read request. Useful for multiple read requests in the same block.
     * @return - MessagingReceipt - The receipt of the read request.
     */
    function readBatch(
        OmniReadRequest[] memory readRequests,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue,
        bytes32 identifier
    ) external payable returns (MessagingReceipt memory);

    /// -----------------------------------------------------------------------
    /// Read public/external functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Quotes the gas needed to pay for the full omnichain transaction in native gas or ZRO token.
     * @param readRequest: The read request.
     * @param readGasLimit: The gas limit for the read request.
     * @param returnDataSize: The size of the return data for the read request.
     * @param msgValue: The value of the read request.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
    function quoteSingle(
        OmniReadRequest calldata readRequest,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue
    ) external view returns (MessagingFee memory fee);

    /**
     * @notice Quotes the gas needed to pay for the full omnichain transaction in native gas or ZRO token.
     * @param readRequests: The read requests.
     * @param readGasLimit: The gas limit for the read requests.
     * @param returnDataSize: The size of the return data for the read requests.
     * @param msgValue: The value of the read requests.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
    function quoteBatch(
        OmniReadRequest[] calldata readRequests,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue
    ) external view returns (MessagingFee memory fee);

    /**
     * @notice Gets the response for a given GUID.
     * @param guid: The GUID of the read request.
     * @return response The response for the given GUID.
     */
    function getResponse(bytes32 guid) external view returns (bytes memory);

    /**
     * @notice Gets the read channel.
     * @return readChannel The read channel.
     */
    function getReadChannel() external view returns (uint32);

    /**
     * @notice Gets the read channel EID threshold.
     * @return readChannelEidThreshold The read channel EID threshold.
     */
    function getReadChannelEidThreshold() external pure returns (uint32);
}
