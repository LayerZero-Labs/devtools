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

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/// @dev Encapsulates test parameters for gas profiling.
struct TestParams {
    uint32 srcEid;
    bytes32 sender;
    uint32 dstEid;
    address receiver;
    bytes[] payloads;
    uint256 msgValue;
    uint256 numOfRuns;
}

/// @dev Encapsulates gas metrics for a specific payload.
struct GasMetrics {
    uint256 averageGas;
    uint256 medianGas;
    uint256 maxGas;
    uint256 minGas;
    uint256 totalMsgValue;
    uint256 successfulRuns;
}

/// @notice Script contract for gas profiling LayerZero's `lzReceive` and `lzCompose` methods.
contract GasProfilerScript is Script {
    using OptionsBuilder for bytes;
    ILayerZeroEndpointV2 public endpoint;

    /// @notice Profiles the gas usage of `lzReceive` over multiple payloads and runs.
    function run_lzReceive(string memory rpcUrl, address endpointAddress, TestParams memory params) external {
        _initializeEndpoint(endpointAddress);
        console.log("Starting gas profiling for lzReceive on dstEid:", params.dstEid);

        vm.createSelectFork(rpcUrl);

        uint64 nextNonce = ILayerZeroReceiver(params.receiver).nextNonce(params.srcEid, params.sender);

        // Initialize an array to hold gas metrics for each payload
        GasMetrics[] memory metrics = new GasMetrics[](params.payloads.length);

        for (uint256 i = 0; i < params.payloads.length; i++) {
            bytes memory currentPayload = params.payloads[i];
            metrics[i] = _profileSinglePayload(
                params,
                params.receiver,
                ILayerZeroReceiver(params.receiver).lzReceive.selector,
                abi.encodeWithSelector(
                    ILayerZeroReceiver(params.receiver).lzReceive.selector,
                    Origin(params.srcEid, params.sender, nextNonce),
                    GUID.generate(
                        nextNonce,
                        params.srcEid,
                        address(uint160(uint256(params.sender))),
                        params.dstEid,
                        bytes32(uint256(uint160(params.receiver)))
                    ),
                    currentPayload,
                    address(this),
                    ""
                )
            );
        }

        console.log("---------------------------------------------------------");
        _logAggregatedMetrics(metrics);
        console.log("---------------------------------------------------------");
        console.log("Finished gas profling for lzReceive on dstEid:", params.dstEid);
        console.log("---------------------------------------------------------");
    }

    /// @notice Profiles the gas usage of `lzCompose` over multiple payloads and runs.
    function run_lzCompose(
        string memory rpcUrl,
        address endpointAddress,
        address composerAddress,
        TestParams memory params
    ) external {
        _initializeEndpoint(endpointAddress);
        console.log("Starting gas profiling for lzCompose on dstEid:", params.dstEid);

        vm.createSelectFork(rpcUrl);

        uint64 nextNonce = ILayerZeroReceiver(params.receiver).nextNonce(params.srcEid, params.sender);

        // Initialize an array to hold gas metrics for each payload
        GasMetrics[] memory metrics = new GasMetrics[](params.payloads.length);

        for (uint256 i = 0; i < params.payloads.length; i++) {
            bytes memory currentPayload = params.payloads[i];
            metrics[i] = _profileSinglePayload(
                params,
                composerAddress,
                ILayerZeroComposer(composerAddress).lzCompose.selector,
                abi.encodeWithSelector(
                    ILayerZeroComposer(composerAddress).lzCompose.selector,
                    params.receiver,
                    GUID.generate(
                        nextNonce,
                        params.srcEid,
                        address(uint160(uint256(params.sender))),
                        params.dstEid,
                        bytes32(uint256(uint160(params.receiver)))
                    ),
                    currentPayload,
                    address(this),
                    ""
                )
            );
        }

        console.log("---------------------------------------------------------");
        _logAggregatedMetrics(metrics);
        console.log("---------------------------------------------------------");
        console.log("Finished gas profling for lzCompose on dstEid:", params.dstEid);
        console.log("---------------------------------------------------------");
    }

    /// @notice Initializes the endpoint contract.
    function _initializeEndpoint(address endpointAddress) internal {
        endpoint = ILayerZeroEndpointV2(endpointAddress);
    }

    /// @notice Profiles gas usage for a single payload and returns the metrics.
    function _profileSinglePayload(
        TestParams memory params,
        address caller,
        bytes4 functionSelector,
        bytes memory callParams
    ) internal returns (GasMetrics memory) {
        uint256[] memory gasUsedArray = new uint256[](params.numOfRuns);
        uint256 totalGasUsed = 0;
        uint256 successfulRuns = 0;

        vm.deal(address(endpoint), 100 ether);

        uint256 snapshotId = vm.snapshotState();
        for (uint256 i = 0; i < params.numOfRuns; i++) {
            vm.revertToState(snapshotId);

            vm.prank(address(endpoint));

            (bool success, ) = caller.call{ value: params.msgValue }(callParams);
            uint256 gasUsed = vm.lastCallGas().gasTotalUsed;

            if (success) {
                gasUsedArray[successfulRuns] = gasUsed;
                totalGasUsed += gasUsed;
                successfulRuns++;
            }
        }

        GasMetrics memory metric;

        if (successfulRuns > 0) {
            metric.averageGas = totalGasUsed / successfulRuns;
            metric.medianGas = _calculateMedian(gasUsedArray, successfulRuns);
            metric.maxGas = _calculateMaximum(gasUsedArray, successfulRuns);
            metric.minGas = _calculateMinimum(gasUsedArray, successfulRuns);
            metric.totalMsgValue = params.msgValue;
            metric.successfulRuns = successfulRuns;
        } else {
            console.log("All runs failed for a payload.");
        }

        return metric;
    }

    /// @notice Logs aggregated gas metrics for all payloads.
    function _logAggregatedMetrics(GasMetrics[] memory metrics) internal pure {
        uint256 totalAverageGas = 0;
        uint256 overallMinGas = type(uint256).max;
        uint256 overallMaxGas = 0;
        uint256 totalSuccessfulRuns = 0;

        for (uint256 i = 0; i < metrics.length; i++) {
            GasMetrics memory metric = metrics[i];
            if (metric.successfulRuns == 0) {
                continue;
            }
            // console.log("Gas Usage Metrics for Payload Index:", i);
            // console.log("Average Gas Used:", metric.averageGas);
            // // console.log("Median Gas Used:", metric.medianGas);
            // // console.log("Maximum Gas Used:", metric.maxGas);
            // // console.log("Minimum Gas Used:", metric.minGas);
            // // console.log("Total msg.value sent:", metric.totalMsgValue);
            // console.log("Successful Runs:", metric.successfulRuns);
            // console.log("------");

            totalAverageGas += metric.averageGas;
            if (metric.minGas < overallMinGas) {
                overallMinGas = metric.minGas;
            }
            if (metric.maxGas > overallMaxGas) {
                overallMaxGas = metric.maxGas;
            }
            totalSuccessfulRuns += metric.successfulRuns;
        }

        if (totalSuccessfulRuns > 0) {
            uint256 overallAverageGas = totalAverageGas / metrics.length;
            console.log("Aggregated Gas Metrics Across All Payloads:");
            console.log("Overall Average Gas Used:", overallAverageGas);
            console.log("Overall Minimum Gas Used:", overallMinGas);
            console.log("Overall Maximum Gas Used:", overallMaxGas);
        } else {
            console.log("No successful runs to aggregate metrics.");
        }
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
        uint256 max = 0;
        for (uint256 i = 0; i < length; i++) {
            if (array[i] > max) {
                max = array[i];
            }
        }
        return max;
    }

    /// @notice Calculates the minimum of an array.
    function _calculateMinimum(uint256[] memory array, uint256 length) internal pure returns (uint256) {
        uint256 min = type(uint256).max;
        for (uint256 i = 0; i < length; i++) {
            if (array[i] < min) {
                min = array[i];
            }
        }
        return min;
    }

    /// @notice Sorts an array in ascending order using Insertion Sort.
    function _sortArray(uint256[] memory array, uint256 length) internal pure {
        for (uint256 i = 1; i < length; i++) {
            uint256 key = array[i];
            uint256 j = i;
            while (j > 0 && array[j - 1] > key) {
                array[j] = array[j - 1];
                j--;
            }
            array[j] = key;
        }
    }
}
