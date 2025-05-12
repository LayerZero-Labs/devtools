// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
import { MessagingFee, Origin, OAppReceiver } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { ReadCodecV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title OmniRead
 * @dev A contract that allows for reading data from multiple chains using LayerZero's read functionality.
 * @notice This contract can be used for onchain and offchain reading.
 * Onchain reading is done by querying `getResponse` function.
 * Offchain reading is done by subscribing to `ReadRequestReceived` event and calling `getResponse` function.
 */
contract OmniRead is OAppRead {
    /// -----------------------------------------------------------------------
    /// Libraries
    /// -----------------------------------------------------------------------

    using OptionsBuilder for bytes;

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
    /// State Variables
    /// -----------------------------------------------------------------------

    mapping(bytes32 guid => bytes response) internal s_responses;
    uint32 internal s_readChannel = READ_CHANNEL_EID_THRESHOLD;

    /// lzRead responses are sent from arbitrary channels with Endpoint IDs in the range of
    /// `eid > 4294965694` (which is `type(uint32).max - 1600`).
    uint32 internal constant READ_CHANNEL_EID_THRESHOLD = 4294965695;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    /**
     * @notice Constructor for the OmniRead contract.
     * @param _endpoint The address of the LayerZero endpoint.
     * @param _delegate The address of the delegate.
     */
    constructor(address _endpoint, address _delegate) OAppRead(_endpoint, _delegate) Ownable(_delegate) {
        _setPeer(READ_CHANNEL_EID_THRESHOLD, AddressCast.toBytes32(address(this)));
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
    ) external payable returns (MessagingReceipt memory) {
        OmniReadRequest[] memory readRequests = new OmniReadRequest[](1);
        readRequests[0] = readRequest;

        readRequests = _handleReadRequestInput(readRequests);

        return _read(readRequests, readGasLimit, returnDataSize, msgValue, identifier);
    }

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
    ) external payable returns (MessagingReceipt memory) {
        readRequests = _handleReadRequestInput(readRequests);
        return _read(readRequests, readGasLimit, returnDataSize, msgValue, identifier);
    }

    /**
     * @notice Sets the LayerZero read channel.
     *
     * @dev Only callable by the owner.
     *
     * @param channelId: The channel ID to set.
     * @param active: Flag to activate or deactivate the channel.
     */
    function setReadChannel(uint32 channelId, bool active) public override(OAppRead) onlyOwner {
        if (channelId < READ_CHANNEL_EID_THRESHOLD) {
            revert OmniRead__InvalidChannelId();
        }

        _setPeer(channelId, active ? AddressCast.toBytes32(address(this)) : bytes32(0));
        s_readChannel = channelId;
    }

    /// -----------------------------------------------------------------------
    /// Write internal/private functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Internal function override to handle incoming messages from another chain.
     * @param guid: A unique global packet identifier for the message.
     * @param payload: The encoded message payload being received.
     *
     * @dev The following params are unused.
     * @dev _origin: A struct containing information about the message sender.
     * @dev _executor: The address of the Executor responsible for processing the message.
     * @dev _extraData: Arbitrary data appended by the Executor to the message.
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 guid,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override(OAppReceiver) {
        s_responses[guid] = payload;

        emit ReadRequestReceived(guid);
    }

    /**
     * @notice Sends read requests to the LayerZero endpoint.
     * @param readRequests: Array of read requests.
     * @param readGasLimit: The gas limit for the read requests.
     * @param returnDataSize: The size of the return data for the read requests.
     * @param msgValue: The value of the read requests.
     * @param identifier: The identifier of the read request. Useful for multiple read requests in the same block.
     * @return receipt The receipt of the read request.
     */
    function _read(
        OmniReadRequest[] memory readRequests,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue,
        bytes32 identifier
    ) internal returns (MessagingReceipt memory receipt) {
        (MessagingFee memory fee, bytes memory options, bytes memory payload) = _quoteWithOptions(
            readRequests,
            readGasLimit,
            returnDataSize,
            msgValue
        );

        receipt = _lzSend(s_readChannel, payload, options, fee, payable(msg.sender));

        emit ReadRequestSent(msg.sender, identifier, receipt.guid);
    }

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
    ) external view returns (MessagingFee memory fee) {
        OmniReadRequest[] memory readRequests = new OmniReadRequest[](1);
        readRequests[0] = readRequest;

        (fee, , ) = _quoteWithOptions(readRequests, readGasLimit, returnDataSize, msgValue);
    }

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
    ) external view returns (MessagingFee memory fee) {
        (fee, , ) = _quoteWithOptions(readRequests, readGasLimit, returnDataSize, msgValue);
    }

    /**
     * @notice Gets the response for a given GUID.
     * @param guid: The GUID of the read request.
     * @return response The response for the given GUID.
     */
    function getResponse(bytes32 guid) external view returns (bytes memory) {
        return s_responses[guid];
    }

    /**
     * @notice Gets the read channel.
     * @return readChannel The read channel.
     */
    function getReadChannel() external view returns (uint32) {
        return s_readChannel;
    }

    /**
     * @notice Gets the read channel EID threshold.
     * @return readChannelEidThreshold The read channel EID threshold.
     */
    function getReadChannelEidThreshold() external pure returns (uint32) {
        return READ_CHANNEL_EID_THRESHOLD;
    }

    /// -----------------------------------------------------------------------
    /// Read internal/private functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Builds the command for the read requests.
     * @param readRequests: The read requests.
     * @return cmd The command for the read requests.
     */
    function _buildCmd(OmniReadRequest[] memory readRequests) internal pure returns (bytes memory) {
        EVMCallRequestV1[] memory evmCallRequests = new EVMCallRequestV1[](readRequests.length);
        for (uint16 i = 0; i < readRequests.length; ) {
            evmCallRequests[i] = EVMCallRequestV1({
                appRequestLabel: i,
                targetEid: readRequests[i].targetEid,
                isBlockNum: readRequests[i].isBlockNum,
                blockNumOrTimestamp: readRequests[i].blockNumOrTimestamp,
                confirmations: readRequests[i].confirmations,
                to: readRequests[i].to,
                callData: readRequests[i].callData
            });

            unchecked {
                ++i;
            }
        }

        return ReadCodecV1.encode(0, evmCallRequests);
    }

    /**
     * @notice Quotes the fee for the read requests.
     * @param readRequests: The read requests.
     * @param readGasLimit: The gas limit for the read requests.
     * @param returnDataSize: The size of the return data for the read requests.
     * @param msgValue: The value of the read requests.
     * @return fee The fee for the read requests.
     */
    function _quoteWithOptions(
        OmniReadRequest[] memory readRequests,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue
    ) internal view returns (MessagingFee memory fee, bytes memory options, bytes memory payload) {
        options = OptionsBuilder.newOptions().addExecutorLzReadOption(readGasLimit, returnDataSize, msgValue);
        payload = _buildCmd(readRequests);

        return (_quote(s_readChannel, payload, options, false), options, payload);
    }

    /**
     * @notice Handles the read request input, filling in the block number or timestamp if it is not provided.
     * @param readRequests: The read requests.
     * @return readRequests: The filled in read requests.
     */
    function _handleReadRequestInput(
        OmniReadRequest[] memory readRequests
    ) internal view returns (OmniReadRequest[] memory) {
        for (uint256 i = readRequests.length; i > 0; ) {
            readRequests[i - 1].blockNumOrTimestamp = readRequests[i - 1].blockNumOrTimestamp == 0 &&
                readRequests[i - 1].isBlockNum
                ? uint64(block.number)
                : uint64(block.timestamp);

            unchecked {
                --i;
            }
        }

        return readRequests;
    }
}
