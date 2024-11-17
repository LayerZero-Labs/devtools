// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import necessary interfaces and contracts
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { ReadCodecV1, EVMCallComputeV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";

/**
 * @title ReadNonViewFunctionExample
 * @notice An OAppRead contract example to call a non-view function returning data.
 */
contract ReadNonViewFunctionExample is OAppRead, OAppOptionsType3 {
    /// @notice Emitted when the amountOut is received.
    /// @param amountOut The amount of tokenOut that would be received.
    event AmountOutReceived(uint256 amountOut);

    /// @notice LayerZero read channel ID.
    uint32 public READ_CHANNEL;

    /// @notice Target chain's Endpoint ID and QuoterV2 contract address.
    uint32 public targetEid;
    address public quoterAddress;
    address public tokenIn;
    address public tokenOut;
    uint24 public fee;

    /**
     * @notice Constructor to initialize the OAppRead contract.
     * @param _endpoint The LayerZero endpoint contract address.
     * @param _readChannel The LayerZero read channel ID.
     * @param _targetEid The target chain's Endpoint ID.
     * @param _quoterAddress The address of the IQuoterV2 contract on the target chain.
     * @param _tokenIn The address of the input token.
     * @param _tokenOut The address of the output token.
     * @param _fee The pool fee.
     */
    constructor(
        address _endpoint,
        uint32 _readChannel,
        uint32 _targetEid,
        address _quoterAddress,
        address _tokenIn,
        address _tokenOut,
        uint24 _fee
    ) OAppRead(_endpoint, msg.sender) Ownable(msg.sender) {
        READ_CHANNEL = _readChannel;
        targetEid = _targetEid;
        quoterAddress = _quoterAddress;
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
        fee = _fee;
        _setPeer(READ_CHANNEL, AddressCast.toBytes32(address(this)));
    }

    /**
     * @notice Sets the LayerZero read channel.
     * @param _channelId The channel ID to set.
     * @param _active Flag to activate or deactivate the channel.
     */
    function setReadChannel(uint32 _channelId, bool _active) public override onlyOwner {
        _setPeer(_channelId, _active ? AddressCast.toBytes32(address(this)) : bytes32(0));
        READ_CHANNEL = _channelId;
    }

    /**
     * @notice Sends a read request to get a quote from Uniswap V3.
     * @param amountIn The input amount of tokenIn.
     * @param _extraOptions Additional messaging options.
     * @return receipt The LayerZero messaging receipt for the request.
     */
    function readQuote(
        uint256 amountIn,
        bytes calldata _extraOptions
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory cmd = getCmd(amountIn);
        return
            _lzSend(
                READ_CHANNEL,
                cmd,
                combineOptions(READ_CHANNEL, 1, _extraOptions),
                MessagingFee(msg.value, 0),
                payable(msg.sender)
            );
    }

    /**
     * @notice Constructs the read command to call `quoteExactInputSingle`.
     * @param amountIn The input amount of tokenIn.
     * @return cmd The encoded command.
     */
    function getCmd(uint256 amountIn) public view returns (bytes memory) {
        // Define the QuoteExactInputSingleParams
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amountIn,
            fee,
            uint160(0) // sqrtPriceLimitX96: No price limit
        );

        // Encode the function call
        bytes memory callData = abi.encodePacked(
            bytes4(keccak256("quoteExactInputSingle((address,address,uint256,uint24,uint160))")),
            params
        );

        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](1);
        readRequests[0] = EVMCallRequestV1({
            appRequestLabel: 1,
            targetEid: targetEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 15,
            to: quoterAddress,
            callData: callData
        });

        // Use lzMap to extract amountOut
        EVMCallComputeV1 memory computeSettings = EVMCallComputeV1({
            computeSetting: 0, // lzMap only
            targetEid: ILayerZeroEndpointV2(endpoint).eid(),
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 15,
            to: address(this)
        });

        return ReadCodecV1.encode(0, readRequests, computeSettings);
    }

    /**
     * @notice Processes the response to extract amountOut.
     * @param _response The response from the read request.
     * @return Encoded amountOut.
     */
    function lzMap(bytes calldata, bytes calldata _response) external pure returns (bytes memory) {
        require(_response.length >= 32, "Invalid response length");
        (uint256 amountOut, , , ) = abi.decode(_response, (uint256, uint160, uint32, uint256));
        return abi.encode(amountOut);
    }

    /**
     * @notice Handles the received amountOut from the target chain.
     * @param _message The encoded amountOut received.
     */
    function _lzReceive(Origin calldata, bytes32, bytes calldata _message, address, bytes calldata) internal override {
        // Decode amountOut
        require(_message.length == 32, "Invalid message length");
        uint256 amountOut = abi.decode(_message, (uint256));
        emit AmountOutReceived(amountOut);
    }
}
