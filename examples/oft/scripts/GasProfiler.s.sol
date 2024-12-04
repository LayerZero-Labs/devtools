// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @title GasProfilerScript
/// @notice Script to profile gas usage of the LayerZero EndpointV2 `lzReceive` method over multiple runs.
import "forge-std/Script.sol";
import "forge-std/console.sol"; // Importing console for logging
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { ILayerZeroReceiver, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";
import { ILayerZeroComposer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";
import { GUID } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/GUID.sol";

/// @notice Script contract for profiling gas usage of LayerZero EndpointV2's `lzReceive` function.
contract GasProfilerScript is Script {
    /// @notice Instance of the LayerZero EndpointV2 contract.
    ILayerZeroEndpointV2 public endpoint;

    /// @notice Struct to encapsulate test parameters.
    struct TestParams {
        address receiver; ///< @dev Address of the receiver.
        uint32 srcEid; ///< @dev Source Endpoint ID.
        bytes32 sender; ///< @dev Sender address encoded as bytes32.
        uint32 dstEid; ///< @dev Destination Endpoint ID.
        bytes payload; ///< @dev Payload data.
        uint256 msgValue; ///< @dev Ether value sent with the message.
        uint256 numOfRuns; ///< @dev Number of runs to execute.
    }

    uint256 totalGasUsed = 0;
    uint256 successfulTests = 0;
    uint64 newNonce = 1;

    /// @notice Main entry point for the script.
    /// @param rpcUrl The RPC URL of the target blockchain network.
    /// @param endpointAddress The deployed address of the EndpointV2 contract on the target chain.
    /// @param receiver The address intended to receive the message (OApp).
    /// @param srcEid The Source Endpoint ID (uint32).
    /// @param sender The Sender address (OApp).
    /// @param payload The Payload data as a bytes array (e.g., "0xabcdef").
    /// @param msgValue The Ether value to send with the message (in wei).
    /// @param numOfRuns The number of runs to execute.
    function run_lzReceive(
        string memory rpcUrl,
        address endpointAddress,
        address receiver,
        uint32 srcEid,
        address sender,
        uint32 dstEid,
        bytes memory payload,
        uint256 msgValue,
        uint256 numOfRuns
    ) external {
        // ================================
        // Initial Setup and Funding
        // ================================

        // Assign sufficient Ether to the script's executing address to cover msgValue transfers
        vm.deal(address(this), 100 ether); // Increased to 100 ether to accommodate more runs

        // Log the start of the gas profiling
        console.log("Starting Gas Profiling for lzReceive...");

        // Initialize the EndpointV2 contract instance at the deployed address on the target chain.
        endpoint = ILayerZeroEndpointV2(endpointAddress);

        // ================================
        // Define Test Parameters (Identical for All Runs)
        // ================================

        // Define a single TestParams instance with fixed parameters.
        TestParams memory params = TestParams({
            receiver: receiver, // Receiver address (OApp)
            srcEid: srcEid, // Source Endpoint ID
            sender: bytes32(uint256(uint160(sender))), // Sender as bytes32 (OApp)
            dstEid: dstEid, // Destination Endpoint ID
            payload: payload, // Payload data
            msgValue: msgValue, // Ether value to send with the message
            numOfRuns: numOfRuns // Number of runs to execute
        });

        // ================================
        // Execute Multiple Test Cases
        // ================================

        uint256 numberOfRuns = params.numOfRuns; // Adjust this value as needed (e.g., 1000)

        // Array to store gasUsed values for statistical calculations
        uint256[] memory gasUsedArray = new uint256[](numberOfRuns);
        uint256 gasUsedCount = 0;

        // Variables to track minimum and maximum gas used
        uint256 minGasUsed = type(uint256).max;
        uint256 minRun = 0;
        uint256 maxGasUsed = 0;
        uint256 maxRun = 0;

        // Compute the payload hash based on a GUID and payload.
        bytes32 guid = GUID.generate(
            newNonce,
            params.srcEid,
            address(uint160(uint256(params.sender))),
            params.dstEid,
            bytes32(uint256(uint160(params.receiver)))
        );

        // Prepare the `Origin` struct for the `lzReceive` function.
        Origin memory origin = Origin({ srcEid: params.srcEid, sender: params.sender, nonce: newNonce });

        for (uint256 i = 0; i < numberOfRuns; i++) {
            // ================================
            // Fork the Desired Blockchain Network
            // ================================
            vm.createSelectFork(rpcUrl);

            vm.startPrank(address(endpoint));

            // Capture gas usage before the call.
            uint256 gasBefore = gasleft();

            // Call `lzReceive` with error handling.
            try
                ILayerZeroReceiver(receiver).lzReceive{ value: params.msgValue }(
                    origin,
                    guid,
                    params.payload,
                    address(this),
                    ""
                )
            {
                // If `lzReceive` executes successfully, record the gas used
                uint256 gasAfter = gasleft();
                uint256 gasUsed = gasBefore - gasAfter;
                gasUsedArray[gasUsedCount] = gasUsed;
                gasUsedCount += 1;

                // Update minimum and maximum gas used
                if (gasUsed < minGasUsed) {
                    minGasUsed = gasUsed;
                    minRun = i + 1;
                }
                if (gasUsed > maxGasUsed) {
                    maxGasUsed = gasUsed;
                    maxRun = i + 1;
                }

                // Accumulate total gas used.
                totalGasUsed += gasUsed;
                successfulTests += 1;
            } catch (bytes memory reason) {
                // If `lzReceive` reverts, decode and log the error.
                if (reason.length < 4) {
                    console.log("Revert without reason");
                } else {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(reason, 32))
                        // Log unknown error selectors and raw revert data.
                    }
                    console.logBytes4(selector);
                    console.logBytes(reason);
                }

                // Continue to the next test case without reverting the entire script.
                continue;
            }

            vm.stopPrank();
        }

        // ================================
        // Calculate and Log Gas Usage Metrics
        // ================================

        // Sort the gasUsedArray
        insertionSort(gasUsedArray, gasUsedCount);

        // Compute the median
        uint256 medianGasUsed;
        if (gasUsedCount > 0) {
            if (gasUsedCount % 2 == 1) {
                // Odd number of elements
                medianGasUsed = gasUsedArray[gasUsedCount / 2];
            } else {
                // Even number of elements, take the average of the two middle elements
                medianGasUsed = (gasUsedArray[(gasUsedCount / 2) - 1] + gasUsedArray[gasUsedCount / 2]) / 2;
            }

            // Calculate the average gas used
            uint256 averageGasUsed = totalGasUsed / successfulTests;

            // Log the metrics
            console.log("Gas Usage Metrics:");
            console.log("Average Gas Used:", averageGasUsed);
            console.log("Median Gas Used:", medianGasUsed);
            console.log("Minimum Gas Used:", minGasUsed, "Minimum Run Number:", minRun);
            console.log("Maximum Gas Used:", maxGasUsed, "Maximum Run Number:", maxRun);
            console.log("Total Successful Runs:", successfulTests);
        } else {
            console.log("No successful test cases to calculate gas usage metrics.");
        }

        // Log the completion of gas profiling
        console.log("Gas Profiling Completed.");
    }

    /// @notice Main entry point for the script to profile `lzCompose`.
    /// @param rpcUrl The RPC URL of the target blockchain network.
    /// @param endpointAddress The deployed address of the EndpointV2 contract on the target chain.
    /// @param receiver The address intended to receive the message (OApp).
    /// @param composer The address of the LayerZero Composer contract.
    /// @param dstEid The Destination Endpoint ID.
    /// @param sender The originating OApp address.
    /// @param srcEid The Source Endpoint ID.
    /// @param payload The message payload.
    /// @param msgValue The Ether value to send with the message (in wei).
    /// @param numOfRuns The number of runs to execute.
    function run_lzCompose(
        string memory rpcUrl,
        address endpointAddress,
        address receiver,
        address composer,
        uint32 dstEid,
        address sender,
        uint32 srcEid,
        bytes memory payload,
        uint256 msgValue,
        uint256 numOfRuns
    ) external {
        // ================================
        // Initial Setup and Funding
        // ================================

        vm.deal(address(this), 100 ether); // Assign sufficient Ether to the script's executing address

        console.log("Starting Gas Profiling for lzCompose...");

        // ================================
        // Fork the Desired Blockchain Network
        // ================================

        endpoint = ILayerZeroEndpointV2(endpointAddress);

        // ================================
        // Execute Multiple Test Cases
        // ================================
        TestParams memory params = TestParams({
            receiver: receiver,
            srcEid: srcEid,
            sender: bytes32(uint256(uint160(sender))),
            dstEid: dstEid,
            payload: payload,
            msgValue: msgValue,
            numOfRuns: numOfRuns
        });

        uint256[] memory gasUsedArray = new uint256[](numOfRuns);
        uint256 gasUsedCount = 0;

        // Compute the payload hash based on a GUID and payload.
        bytes32 guid = GUID.generate(
            newNonce,
            params.srcEid,
            address(uint160(uint256(params.sender))),
            params.dstEid,
            bytes32(uint256(uint160(params.receiver)))
        );

        uint256 minGasUsed = type(uint256).max;
        uint256 minRun = 0;
        uint256 maxGasUsed = 0;
        uint256 maxRun = 0;

        for (uint256 i = 0; i < numOfRuns; i++) {
            // Fork the blockchain network
            vm.createSelectFork(rpcUrl, 32210962);

            vm.startPrank(address(endpoint));

            // Capture gas usage before the call
            uint256 gasBefore = gasleft();

            // Call `lzCompose` with error handling
            try
                ILayerZeroComposer(composer).lzCompose{ value: params.msgValue }(
                    receiver,
                    guid,
                    params.payload,
                    msg.sender,
                    ""
                )
            {
                uint256 gasAfter = gasleft();
                uint256 gasUsed = gasBefore - gasAfter;
                gasUsedArray[gasUsedCount] = gasUsed;
                gasUsedCount += 1;

                if (gasUsed < minGasUsed) {
                    minGasUsed = gasUsed;
                    minRun = i + 1;
                }
                if (gasUsed > maxGasUsed) {
                    maxGasUsed = gasUsed;
                    maxRun = i + 1;
                }

                totalGasUsed += gasUsed;
                successfulTests += 1;
            } catch (bytes memory reason) {
                if (reason.length < 4) {
                    console.log("Revert without reason");
                } else {
                    bytes4 selector;
                    assembly {
                        selector := mload(add(reason, 32))
                    }
                    console.logBytes4(selector);
                    console.logBytes(reason);
                }
                continue;
            }

            vm.stopPrank();
        }

        // ================================
        // Calculate and Log Gas Usage Metrics
        // ================================

        insertionSort(gasUsedArray, gasUsedCount);

        uint256 medianGasUsed;
        if (gasUsedCount > 0) {
            if (gasUsedCount % 2 == 1) {
                medianGasUsed = gasUsedArray[gasUsedCount / 2];
            } else {
                medianGasUsed = (gasUsedArray[(gasUsedCount / 2) - 1] + gasUsedArray[gasUsedCount / 2]) / 2;
            }

            uint256 averageGasUsed = totalGasUsed / successfulTests;

            console.log("Gas Usage Metrics:");
            console.log("Average Gas Used:", averageGasUsed);
            console.log("Median Gas Used:", medianGasUsed);
            console.log("Minimum Gas Used:", minGasUsed, "Minimum Run Number:", minRun);
            console.log("Maximum Gas Used:", maxGasUsed, "Maximum Run Number:", maxRun);
            console.log("Total Successful Runs:", successfulTests);
        } else {
            console.log("No successful test cases to calculate gas usage metrics.");
        }

        console.log("Gas Profiling for lzCompose Completed.");
    }

    /// @notice Computes the storage slot for `lazyInboundNonce` based on the provided parameters.
    function computeLazyInboundNonceSlot(
        address _receiver,
        uint32 _srcEid,
        bytes32 _sender,
        uint256 baseSlot
    ) internal pure returns (bytes32) {
        bytes32 slot1 = keccak256(abi.encode(_receiver, baseSlot));
        bytes32 slot2 = keccak256(abi.encode(_srcEid, slot1));
        bytes32 slot3 = keccak256(abi.encode(_sender, slot2));
        return slot3;
    }

    /// @notice Computes the storage slot for `inboundPayloadHash` based on the provided parameters.
    function computeInboundPayloadHashSlot(
        address _receiver,
        uint32 _srcEid,
        bytes32 _sender,
        uint64 _nonce,
        uint256 baseSlot
    ) internal pure returns (bytes32) {
        bytes32 slot3 = computeLazyInboundNonceSlot(_receiver, _srcEid, _sender, baseSlot);
        bytes32 slot4 = keccak256(abi.encode(_nonce, slot3));
        return slot4;
    }

    /// @notice Helper function to extract a slice from a bytes array.
    /// @param data The original bytes array.
    /// @param start The starting index of the slice.
    /// @param end The ending index of the slice.
    /// @return A new bytes array containing the sliced data.
    function slice(bytes memory data, uint256 start, uint256 end) internal pure returns (bytes memory) {
        require(end >= start, "Invalid slice indices");
        require(data.length >= end, "Slice out of bounds");
        bytes memory result = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = data[i];
        }
        return result;
    }

    /// @notice Sorts an array of uint256 in ascending order using Insertion Sort.
    /// @param array The array to sort.
    /// @param length The number of elements in the array to sort.
    function insertionSort(uint256[] memory array, uint256 length) internal pure {
        for (uint256 i = 1; i < length; i++) {
            uint256 key = array[i];
            uint256 j = i - 1;

            // Move elements of array[0..i-1], that are greater than key, to one position ahead
            while ((int256(j) >= 0) && (array[j] > key)) {
                array[j + 1] = array[j];
                if (j == 0) {
                    break;
                }
                j--;
            }

            if (array[j] > key) {
                array[j + 1] = key;
            } else {
                array[j + 1] = key;
            }
        }
    }
}
