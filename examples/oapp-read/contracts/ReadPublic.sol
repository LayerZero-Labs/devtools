// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import necessary interfaces and contracts
import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { ReadCodecV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IExampleContract
/// @notice Interface for the ExampleContract's `data()` function.
interface IExampleContract {
    function data() external view returns (uint256);
}

/// @title ReadPublic
/// @notice An OAppRead contract example to read a public state variable from another chain.
contract ReadPublic is OAppRead, OAppOptionsType3 {
    /// @notice Emitted when the data is received.
    /// @param data The value of the public state variable.
    event DataReceived(uint256 data);

    /// @notice LayerZero read channel ID.
    uint32 public READ_CHANNEL;

    /// @notice Message type for the read operation.
    uint16 public constant READ_TYPE = 1;

    /**
     * @notice Constructor to initialize the OAppRead contract.
     *
     * @param _endpoint The LayerZero endpoint contract address.
     * @param _delegate The address that will have ownership privileges.
     * @param _readChannel The LayerZero read channel ID.
     */
    constructor(
        address _endpoint,
        address _delegate,
        uint32 _readChannel
    ) OAppRead(_endpoint, _delegate) Ownable(_delegate) {
        READ_CHANNEL = _readChannel;
        _setPeer(_readChannel, AddressCast.toBytes32(address(this)));
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
     * @notice Sends a read request to fetch the public state variable `data`.
     *
     * @dev The caller must send enough ETH to cover the messaging fee.
     *
     * @param _targetContractAddress The address of the contract on the target chain containing the `data` variable.
     * @param _targetEid The target chain's Endpoint ID.
     * @param _extraOptions Additional messaging options.
     *
     * @return receipt The LayerZero messaging receipt for the request.
     */
    function readData(
        address _targetContractAddress,
        uint32 _targetEid,
        bytes calldata _extraOptions
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory cmd = _getCmd(_targetContractAddress, _targetEid);
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
     * @notice Estimates the messaging fee required to perform the read operation.
     *
     * @param _targetContractAddress The address of the contract on the target chain containing the `data` variable.
     * @param _targetEid The target chain's Endpoint ID.
     * @param _extraOptions Additional messaging options.
     *
     * @return fee The estimated messaging fee.
     */
    function quoteReadFee(
        address _targetContractAddress,
        uint32 _targetEid,
        bytes calldata _extraOptions
    ) external view returns (MessagingFee memory fee) {
        return
            _quote(
                READ_CHANNEL,
                _getCmd(_targetContractAddress, _targetEid),
                _combineOptions(READ_CHANNEL, READ_TYPE, _extraOptions),
                false
            );
    }

    /**
     * @notice Constructs the read command to fetch the `data` variable.
     *
     * @param _targetContractAddress The address of the contract containing the `data` variable.
     * @param _targetEid The target chain's Endpoint ID.
     *
     * @return cmd The encoded command.
     */
    function _getCmd(address _targetContractAddress, uint32 _targetEid) internal view returns (bytes memory cmd) {
        // Use the function selector from the interface to ensure correctness
        bytes memory callData = abi.encodeWithSelector(IExampleContract.data.selector);

        // Create an array of EVMCallRequestV1 with a single read request
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](1);
        readRequests[0] = EVMCallRequestV1({
            appRequestLabel: 1, // Application-specific label for tracking
            targetEid: _targetEid, // Endpoint ID of the target chain
            isBlockNum: false, // Use timestamp instead of block number
            blockNumOrTimestamp: uint64(block.timestamp), // Timestamp to read the state at
            confirmations: 15, // Number of confirmations to wait for finality
            to: _targetContractAddress, // Address of the contract to read from
            callData: callData // Encoded function call data
        });

        // No compute logic needed; encode the command with appLabel 0
        cmd = ReadCodecV1.encode(0, readRequests);
    }

    /**
     * @notice Handles the received data from the target chain.
     *
     * @dev This function is called internally by the LayerZero protocol.
     *
     * @param _message The encoded data received.
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the data received from bytes to uint256
        uint256 data = abi.decode(_message, (uint256));
        emit DataReceived(data);
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
