// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import necessary interfaces and contracts
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { IOAppMapper } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppMapper.sol";
import { IOAppReducer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppReducer.sol";
import { EVMCallRequestV1, EVMCallComputeV1, ReadCodecV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";

import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
import { MessagingFee, MessagingReceipt, ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

/// @title IExampleContract
/// @notice Interface for the ExampleContract's `add` function.
interface IExampleContract {
    function add(uint256 a, uint256 b) external pure returns (uint256);
}

/// @title ReadViewOrPureAndCompute
/// @notice An OAppRead contract example that calls a view or pure function from another chain and performs compute operations.
contract ReadViewOrPureAndCompute is OAppRead, IOAppMapper, IOAppReducer, OAppOptionsType3 {
    /// @notice Emitted when the sum is received after compute operations.
    ///
    /// @param sum The final result after computation.
    event SumReceived(uint256 sum);

    /// @notice LayerZero read channel ID.
    uint32 public READ_CHANNEL;

    /// @notice Message type for the read operation.
    uint16 public constant READ_TYPE = 1;

    /// @notice Target chain's Endpoint ID.
    uint32 public immutable targetEid;

    /// @notice Target contract address on the target chain.
    address public immutable targetContractAddress;

    /**
     * @notice Constructor to initialize the OAppRead contract.
     *
     * @param _endpoint The LayerZero endpoint contract address.
     * @param _readChannel The LayerZero read channel ID.
     * @param _targetEid The target chain's Endpoint ID.
     * @param _targetContractAddress The address of the contract on the target chain.
     */
    constructor(
        address _endpoint,
        uint32 _readChannel,
        uint32 _targetEid,
        address _targetContractAddress
    ) OAppRead(_endpoint, msg.sender) Ownable(msg.sender) {
        READ_CHANNEL = _readChannel;
        targetEid = _targetEid;
        targetContractAddress = _targetContractAddress;
        _setPeer(READ_CHANNEL, AddressCast.toBytes32(address(this)));
    }

    /**
     * @notice Sets the LayerZero read channel.
     *
     * @dev Only callable by the owner.
     *
     * @param _channelId The channel ID to set.
     * @param _active Flag to activate or deactivate the channel.
     */
    function setReadChannel(uint32 _channelId, bool _active) public override onlyOwner {
        _setPeer(_channelId, _active ? AddressCast.toBytes32(address(this)) : bytes32(0));
        READ_CHANNEL = _channelId;
    }

    /**
     * @notice Sends a read request to call the `add` function and performs compute operations.
     *
     * @dev The caller must send enough ETH to cover the messaging fee.
     *
     * @param a The first number.
     * @param b The second number.
     * @param _extraOptions Additional messaging options.
     *
     * @return The LayerZero messaging receipt for the request.
     */
    function readSum(
        uint256 a,
        uint256 b,
        bytes calldata _extraOptions
    ) external payable returns (MessagingReceipt memory) {
        bytes memory cmd = _getCmd(a, b);
        return
            _lzSend(
                READ_CHANNEL,
                cmd,
                _combineOptions(READ_CHANNEL, READ_TYPE, _extraOptions),
                MessagingFee(msg.value, 0),
                payable(msg.sender)
            );
    }

    /**
     * @notice Estimates the messaging fee required to perform the read and compute operation.
     *
     * @param a The first number to sum.
     * @param b The second number to sum.
     * @param _extraOptions Additional messaging options.
     *
     * @return fee The estimated messaging fee.
     */
    function quoteReadFee(
        uint256 a,
        uint256 b,
        bytes calldata _extraOptions
    ) external view returns (MessagingFee memory fee) {
        return _quote(READ_CHANNEL, _getCmd(a, b), _combineOptions(READ_CHANNEL, READ_TYPE, _extraOptions), false);
    }

    /**
     * @notice Constructs the read command to call the `add` function and sets up compute requests.
     *
     * @param a The first number.
     * @param b The second number.
     *
     * @return The encoded command.
     */
    function _getCmd(uint256 a, uint256 b) internal view returns (bytes memory) {
        // Encode callData to call add(a, b) function using the function selector
        bytes memory callData = abi.encodeWithSelector(IExampleContract.add.selector, a, b);

        // Create an array of EVMCallRequestV1 with a single read request
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](1);
        readRequests[0] = EVMCallRequestV1({
            appRequestLabel: 1, // Application-specific label for tracking
            targetEid: targetEid, // Endpoint ID of the target chain
            isBlockNum: false, // Use timestamp instead of block number
            blockNumOrTimestamp: uint64(block.timestamp), // Timestamp to read the state at
            confirmations: 15, // Number of confirmations to wait for finality
            to: targetContractAddress, // Address of the contract to call
            callData: callData // Encoded function call data
        });

        // Create an EVMCallComputeV1 struct with a compute request
        EVMCallComputeV1 memory computeRequest;
        computeRequest = EVMCallComputeV1({
            computeSetting: 2, // Use both lzMap() and lzReduce()
            targetEid: ILayerZeroEndpointV2(endpoint).eid(), // Endpoint ID of the current chain
            isBlockNum: false, // Use timestamp instead of block number
            blockNumOrTimestamp: uint64(block.timestamp), // Timestamp to execute the compute at
            confirmations: 15, // Number of confirmations to wait for finality
            to: address(this) // Address of this contract to call lzMap and lzReduce
        });

        // Encode the command with an arbitrary appLabel, in this case 0
        return ReadCodecV1.encode(0, readRequests, computeRequest);
    }

    /**
     * @notice The map function called during the compute process.
     *
     * @dev _request The original request data.
     * @param _response The response data from the read request.
     *
     * @return The transformed data after the map operation.
     */
    function lzMap(
        bytes calldata /*_request*/,
        bytes calldata _response
    ) external pure override returns (bytes memory) {
        uint256 sum = abi.decode(_response, (uint256));
        sum += 1; // Example computation: increment the sum by 1
        return abi.encode(sum);
    }

    /**
     * @notice The reduce function called during the compute process.
     *
     * @dev _cmd The original command data.
     * @param _responses The array of responses from the raw response or map functions.
     *
     * @return The final result after the reduce operation.
     */
    function lzReduce(
        bytes calldata /*_cmd*/,
        bytes[] calldata _responses
    ) external pure override returns (bytes memory) {
        uint256 totalSum = 0;
        for (uint256 i = 0; i < _responses.length; i++) {
            require(_responses[i].length == 32, "Invalid response length");
            uint256 sum = abi.decode(_responses[i], (uint256));
            totalSum += sum; // Example computation: get the totalSum by adding the sum of all responses
        }
        return abi.encode(totalSum);
    }

    /**
     * @notice Handles the received sum from the target chain after compute operations.
     *
     * @dev This function is called internally by the LayerZero protocol.
     *
     * @param _message The encoded sum received.
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the sum received
        require(_message.length == 32, "Invalid message length");
        uint256 sum = abi.decode(_message, (uint256));
        emit SumReceived(sum);
    }

    /**
     * @notice Combines the options for messaging.
     *
     * @param _channelId The channel ID.
     * @param _msgType The message type.
     * @param _extraOptions Additional options.
     *
     * @return options The combined options.
     */
    function _combineOptions(
        uint32 _channelId,
        uint16 _msgType,
        bytes calldata _extraOptions
    ) internal view returns (bytes memory options) {
        options = combineOptions(_channelId, _msgType, _extraOptions);
    }
}
