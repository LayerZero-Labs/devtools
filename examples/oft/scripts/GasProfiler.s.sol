// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @title GasProfilerScript
/// @notice Profiles gas usage for LayerZero's `lzReceive` and `lzCompose` methods over multiple runs.
import "forge-std/Script.sol";
import "forge-std/console.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { ILayerZeroReceiver, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";
import { ILayerZeroComposer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";
import { GUID } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/GUID.sol";

/// @dev Encapsulates test parameters for gas profiling.
struct TestParams {
    /// @notice Source endpoint ID.
    uint32 srcEid;
    /// @notice Encoded sender address as `bytes32`.
    bytes32 sender;
    /// @notice Destination endpoint ID.
    uint32 dstEid;
    /// @notice Address of the receiver contract (OApp).
    address receiver;
    /// @notice Payload data to be sent.
    bytes payload;
    /// @notice Ether value sent with the message (in wei).
    uint256 msgValue;
    /// @notice Number of profiling runs.
    uint256 numOfRuns;
}

/// @notice Script contract for gas profiling LayerZero's `lzReceive` and `lzCompose` methods.
contract GasProfilerScript is Script {
    ILayerZeroEndpointV2 public endpoint;

    /// @notice Profiles the gas usage of `lzReceive`.
    /// @param rpcUrl RPC URL of the target blockchain.
    /// @param endpointAddress Address of the LayerZero EndpointV2 contract.
    /// @param receiver Address of the receiver contract (OApp).
    /// @param srcEid Source endpoint ID.
    /// @param sender Sender address (OApp).
    /// @param dstEid Destination endpoint ID.
    /// @param payload Message payload as a `bytes` array.
    /// @param msgValue Ether value to send with the message (in wei).
    /// @param numOfRuns Number of runs to execute.
    function run_lzReceive(
        string memory rpcUrl,
        address endpointAddress,
        uint32 srcEid,
        address sender,
        uint32 dstEid,
        address receiver,
        bytes memory payload,
        uint256 msgValue,
        uint256 numOfRuns
    ) external {
        _initializeEndpoint(endpointAddress);
        console.log("Starting gas profiling for lzReceive...");

        TestParams memory params = _createTestParams(srcEid, sender, dstEid, receiver, payload, msgValue, numOfRuns);

        _profileGasUsage(
            rpcUrl,
            params,
            receiver,
            abi.encodeWithSelector(
                ILayerZeroReceiver(receiver).lzReceive.selector,
                Origin(params.srcEid, params.sender, 1),
                GUID.generate(
                    1,
                    params.srcEid,
                    address(uint160(uint256(params.sender))),
                    params.dstEid,
                    bytes32(uint256(uint160(params.receiver)))
                ),
                params.payload,
                address(this),
                ""
            )
        );
    }

    /// @notice Profiles the gas usage of `lzCompose`.
    /// @param rpcUrl RPC URL of the target blockchain.
    /// @param endpointAddress Address of the LayerZero EndpointV2 contract.
    /// @param receiver Address of the receiver contract (OApp).
    /// @param composer Address of the LayerZero Composer contract.
    /// @param dstEid Destination endpoint ID.
    /// @param sender Sender address (OApp).
    /// @param srcEid Source endpoint ID.
    /// @param payload Message payload as a `bytes` array.
    /// @param msgValue Ether value to send with the message (in wei).
    /// @param numOfRuns Number of runs to execute.
    function run_lzCompose(
        string memory rpcUrl,
        address endpointAddress,
        uint32 srcEid,
        address sender,
        uint32 dstEid,
        address receiver,
        address composer,
        bytes memory payload,
        uint256 msgValue,
        uint256 numOfRuns
    ) external {
        _initializeEndpoint(endpointAddress);
        console.log("Starting gas profiling for lzCompose...");

        TestParams memory params = _createTestParams(srcEid, sender, dstEid, receiver, payload, msgValue, numOfRuns);

        _profileGasUsage(
            rpcUrl,
            params,
            composer,
            abi.encodeWithSelector(
                ILayerZeroComposer(composer).lzCompose.selector,
                params.receiver,
                GUID.generate(
                    1,
                    params.srcEid,
                    address(uint160(uint256(params.sender))),
                    params.dstEid,
                    bytes32(uint256(uint160(params.receiver)))
                ),
                params.payload,
                address(this),
                ""
            )
        );
    }

    /// @notice Initializes the endpoint contract.
    /// @param endpointAddress Address of the LayerZero EndpointV2 contract.
    function _initializeEndpoint(address endpointAddress) internal {
        endpoint = ILayerZeroEndpointV2(endpointAddress);
    }

    /// @notice Creates a `TestParams` instance.
    function _createTestParams(
        uint32 srcEid,
        address sender,
        uint32 dstEid,
        address receiver,
        bytes memory payload,
        uint256 msgValue,
        uint256 numOfRuns
    ) internal pure returns (TestParams memory) {
        return
            TestParams({
                srcEid: srcEid,
                sender: bytes32(uint256(uint160(sender))),
                dstEid: dstEid,
                receiver: receiver,
                payload: payload,
                msgValue: msgValue,
                numOfRuns: numOfRuns
            });
    }

    /// @notice Profiles gas usage of a function.
    function _profileGasUsage(
        string memory rpcUrl,
        TestParams memory params,
        address caller,
        bytes memory callParams
    ) internal {
        uint256[] memory gasUsedArray = new uint256[](params.numOfRuns);
        uint256 totalGasUsed = 0;
        uint256 successfulRuns = 0;

        for (uint256 i = 0; i < params.numOfRuns; i++) {
            vm.createSelectFork(rpcUrl);
            vm.deal(address(endpoint), 100 ether);
            vm.startPrank(address(endpoint));

            (bool success, ) = caller.call{ value: params.msgValue }(callParams);
            uint64 gasUsed = vm.lastCallGas().gasTotalUsed;

            vm.stopPrank();

            if (success) {
                gasUsedArray[successfulRuns] = gasUsed;
                totalGasUsed += gasUsed;
                successfulRuns++;
            }
        }

        _logGasMetrics(gasUsedArray, totalGasUsed, successfulRuns);
    }

    /// @notice Logs gas usage metrics.
    function _logGasMetrics(uint256[] memory gasUsedArray, uint256 totalGasUsed, uint256 successfulRuns) internal view {
        uint256 averageGas = totalGasUsed / successfulRuns;
        uint256 medianGas = _calculateMedian(gasUsedArray, successfulRuns);
        uint256 maximumGas = _calculateMaximum(gasUsedArray, successfulRuns);
        uint256 minimumGas = _calculateMinimum(gasUsedArray, successfulRuns);

        console.log("Gas Usage Metrics:");
        console.log("Average Gas Used:", averageGas);
        console.log("Median Gas Used:", medianGas);
        console.log("Maximum Gas Used:", maximumGas);
        console.log("Minimum Gas Used:", minimumGas);
        console.log("Successful Runs:", successfulRuns);
    }

    /// @notice Calculates the median of an array.
    function _calculateMedian(uint256[] memory array, uint256 length) internal pure returns (uint256) {
        _sortArray(array, length);
        if (length % 2 == 1) {
            return array[length / 2];
        } else {
            return (array[length / 2 - 1] + array[length / 2]) / 2;
        }
    }

    /// @notice Calculates the maximum of an array.
    function _calculateMaximum(uint256[] memory array, uint256 length) internal pure returns (uint256) {
        _sortArray(array, length);
        return array[length - 1];
    }

    /// @notice Calculates the minimum of an array.
    function _calculateMinimum(uint256[] memory array, uint256 length) internal pure returns (uint256) {
        _sortArray(array, length);
        return array[0];
    }

    /// @notice Sorts an array in ascending order.
    function _sortArray(uint256[] memory array, uint256 length) internal pure {
        for (uint256 i = 1; i < length; i++) {
            uint256 key = array[i];
            uint256 j = i - 1;
            while (j >= 0 && array[j] > key) {
                array[j + 1] = array[j];
                j--;
            }
            array[j + 1] = key;
        }
    }
}
