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

    // ──────────────────────────────────────────────────────────────────────────────
    // 0. (Optional) Quote business logic
    //
    // Example: Get a quote from the Endpoint for a cost estimate of reading data.
    // Replace this to mirror your own read business logic.
    // ──────────────────────────────────────────────────────────────────────────────

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
                combineOptions(READ_CHANNEL, READ_TYPE, _extraOptions),
                false
            );
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // 1a. Send business logic
    //
    // Example: send a read request to fetch data from a remote contract.
    // Replace this with your own read request logic.
    // ──────────────────────────────────────────────────────────────────────────────

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
        // 1. Build the read command for the target contract and function
        bytes memory cmd = _getCmd(_targetContractAddress, _targetEid);

        // 2. Send the read request via LayerZero
        //    - READ_CHANNEL: Special channel ID for read operations
        //    - cmd: Encoded read command with target details
        //    - combineOptions: Merge enforced options with caller-provided options
        //    - MessagingFee(msg.value, 0): Pay all fees in native gas; no ZRO
        //    - payable(msg.sender): Refund excess gas to caller
        return
            _lzSend(
                READ_CHANNEL,
                cmd,
                combineOptions(READ_CHANNEL, READ_TYPE, _extraOptions),
                MessagingFee(msg.value, 0),
                payable(msg.sender)
            );
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // 1b. Read command construction
    //
    // This function defines WHAT data to fetch from the target network and WHERE to fetch it from.
    // This is the core of LayerZero Read - specifying exactly which contract function to call
    // on which chain and how to handle the request.
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Constructs the read command to fetch the `data` variable from target chain.
     * @dev This function defines the core read operation - what data to fetch and from where.
     *      Replace this logic to read different functions or data from your target contracts.
     *
     * @param _targetContractAddress The address of the contract containing the `data` variable.
     * @param _targetEid The target chain's Endpoint ID.
     *
     * @return cmd The encoded command that specifies what data to read.
     */
    function _getCmd(address _targetContractAddress, uint32 _targetEid) internal view returns (bytes memory cmd) {
        // 1. Define WHAT function to call on the target contract
        //    Using the interface selector ensures type safety and correctness
        //    You can replace this with any public/external function or state variable
        bytes memory callData = abi.encodeWithSelector(IExampleContract.data.selector);

        // 2. Build the read request specifying WHERE and HOW to fetch the data
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](1);
        readRequests[0] = EVMCallRequestV1({
            appRequestLabel: 1, // Label for tracking this specific request
            targetEid: _targetEid, // WHICH chain to read from
            isBlockNum: false, // Use timestamp (not block number)
            blockNumOrTimestamp: uint64(block.timestamp), // WHEN to read the state (current time)
            confirmations: 15, // HOW many confirmations to wait for
            to: _targetContractAddress, // WHERE - the contract address to call
            callData: callData // WHAT - the function call to execute
        });

        // 3. Encode the complete read command
        //    No compute logic needed for simple data reading
        //    The appLabel (0) can be used to identify different types of read operations
        cmd = ReadCodecV1.encode(0, readRequests);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // 2. Receive business logic
    //
    // Override _lzReceive to handle the returned data from the read request.
    // The base OAppReceiver.lzReceive ensures:
    //   • Only the LayerZero Endpoint can call this method
    //   • The sender is a registered peer (peers[srcEid] == origin.sender)
    // ──────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Handles the received data from the target chain.
     *
     * @dev This function is called internally by the LayerZero protocol.
     * @dev   _origin    Metadata (source chain, sender address, nonce)
     * @dev   _guid      Global unique ID for tracking this response
     * @param _message   The data returned from the read request (uint256 in this case)
     * @dev   _executor  Executor address that delivered the response
     * @dev   _extraData Additional data from the Executor (unused here)
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // 1. Decode the returned data from bytes to uint256
        uint256 data = abi.decode(_message, (uint256));

        // 2. Emit an event with the received data
        emit DataReceived(data);

        // 3. (Optional) Apply your custom logic here.
        //    e.g., store the data, trigger additional actions, etc.
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // 3. Admin functions
    //
    // Functions for managing the read channel configuration.
    // ──────────────────────────────────────────────────────────────────────────────

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
}
