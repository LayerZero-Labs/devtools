// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { IOAppMapper } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppMapper.sol";
import { IOAppReducer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppReducer.sol";
import { ReadCodecV1, EVMCallComputeV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";

contract MyOAppRead is OAppRead, IOAppMapper, IOAppReducer {
    struct EvmReadRequest {
        uint16 appRequestLabel;
        uint32 targetEid;
        bool isBlockNum;
        uint64 blockNumOrTimestamp;
        uint16 confirmations;
        address to;
    }

    struct EvmComputeRequest {
        uint8 computeSetting;
        uint32 targetEid;
        bool isBlockNum;
        uint64 blockNumOrTimestamp;
        uint16 confirmations;
        address to;
    }

    uint8 internal constant COMPUTE_SETTING_MAP_ONLY = 0;
    uint8 internal constant COMPUTE_SETTING_REDUCE_ONLY = 1;
    uint8 internal constant COMPUTE_SETTING_MAP_REDUCE = 2;
    uint8 internal constant COMPUTE_SETTING_NONE = 3;

    constructor(
        address _endpoint,
        address _delegate,
        string memory _identifier
    ) OAppRead(_endpoint, _delegate) Ownable(_delegate) {
        identifier = _identifier;
    }

    string public identifier;
    bytes public data = abi.encode("Nothing received yet.");

    /**
     * @notice Send a read command in loopback through channelId
     * @param _channelId Read Channel ID to be used for the message.
     * @param _appLabel The application label to use for the message.
     * @param _requests An array of `EvmReadRequest` structs containing the read requests to be made.
     * @param _computeRequest A `EvmComputeRequest` struct containing the compute request to be made.
     * @param _options Message execution options (e.g., for sending gas to destination).
     * @dev Encodes the message as bytes and sends it using the `_lzSend` internal function.
     * @return receipt A `MessagingReceipt` struct containing details of the message sent.
     */
    function send(
        uint32 _channelId,
        uint16 _appLabel,
        EvmReadRequest[] memory _requests,
        EvmComputeRequest memory _computeRequest,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory cmd = buildCmd(_appLabel, _requests, _computeRequest);
        receipt = _lzSend(_channelId, cmd, _options, MessagingFee(msg.value, 0), payable(msg.sender));
    }

    /**
     * @notice Quotes the gas needed to pay for the full read command in native gas or ZRO token.
     * @param _channelId Read Channel ID to be used for the message.
     * @param _appLabel The application label to use for the message.
     * @param _requests An array of `EvmReadRequest` structs containing the read requests to be made.
     * @param _computeRequest A `EvmComputeRequest` struct containing the compute request to be made.
     * @param _options Message execution options (e.g., for sending gas to destination).
     * @param _payInLzToken Whether to return fee in ZRO token.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
    function quote(
        uint32 _channelId,
        uint16 _appLabel,
        EvmReadRequest[] memory _requests,
        EvmComputeRequest memory _computeRequest,
        bytes calldata _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory cmd = buildCmd(_appLabel, _requests, _computeRequest);
        fee = _quote(_channelId, cmd, _options, _payInLzToken);
    }

    /**
     * @notice Builds the command to be sent
     * @param appLabel The application label to use for the message.
     * @param _readRequests An array of `EvmReadRequest` structs containing the read requests to be made.
     * @param _computeRequest A `EvmComputeRequest` struct containing the compute request to be made.
     * @return cmd The encoded command to be sent to the channel.
     */
    function buildCmd(
        uint16 appLabel,
        EvmReadRequest[] memory _readRequests,
        EvmComputeRequest memory _computeRequest
    ) public pure returns (bytes memory) {
        require(_readRequests.length > 0, "LzReadCounter: empty requests");
        // build read requests
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](_readRequests.length);
        for (uint256 i = 0; i < _readRequests.length; i++) {
            EvmReadRequest memory req = _readRequests[i];
            readRequests[i] = EVMCallRequestV1({
                appRequestLabel: req.appRequestLabel,
                targetEid: req.targetEid,
                isBlockNum: req.isBlockNum,
                blockNumOrTimestamp: req.blockNumOrTimestamp,
                confirmations: req.confirmations,
                to: req.to,
                callData: abi.encodeWithSelector(this.myInformation.selector)
            });
        }

        require(_computeRequest.computeSetting <= COMPUTE_SETTING_NONE, "LzReadCounter: invalid compute type");
        EVMCallComputeV1 memory evmCompute = EVMCallComputeV1({
            computeSetting: _computeRequest.computeSetting,
            targetEid: _computeRequest.computeSetting == COMPUTE_SETTING_NONE ? 0 : _computeRequest.targetEid,
            isBlockNum: _computeRequest.isBlockNum,
            blockNumOrTimestamp: _computeRequest.blockNumOrTimestamp,
            confirmations: _computeRequest.confirmations,
            to: _computeRequest.to
        });
        bytes memory cmd = ReadCodecV1.encode(appLabel, readRequests, evmCompute);

        return cmd;
    }

    /**
     * @dev Internal function override to handle incoming messages from another chain.
     * @param payload The encoded message payload being received. This is the resolved command from the DVN
     *
     * @dev The following params are unused in the current implementation of the OApp.
     * @dev _origin A struct containing information about the message sender.
     * @dev _guid A unique global packet identifier for the message.
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
        data = payload;
    }

    function myInformation() public view returns (bytes memory) {
        return abi.encodePacked("_id:", identifier, "_blockNumber:", block.number);
    }

    function lzMap(bytes calldata _request, bytes calldata _response) external pure returns (bytes memory) {
        uint16 requestLabel = ReadCodecV1.decodeRequestV1AppRequestLabel(_request);
        return abi.encodePacked(_response, "_mapped_requestLabel:", requestLabel);
    }

    function lzReduce(bytes calldata _cmd, bytes[] calldata _responses) external pure returns (bytes memory) {
        uint16 appLabel = ReadCodecV1.decodeCmdAppLabel(_cmd);
        bytes memory concatenatedResponses;

        for (uint256 i = 0; i < _responses.length; i++) {
            concatenatedResponses = abi.encodePacked(concatenatedResponses, _responses[i]);
        }
        return abi.encodePacked(concatenatedResponses, "_reduced_appLabel:", appLabel);
    }
}
