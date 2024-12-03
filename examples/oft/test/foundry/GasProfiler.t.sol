// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/// @title GasProfilerTest
/// @notice This contract tests gas and msg.value usage of the `lzReceive` function in the LayerZero EndpointV2 contract.
import "forge-std/Test.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";

contract GasProfilerTest is Test {
    /// @notice Instance of the LayerZero EndpointV2 contract.
    ILayerZeroEndpointV2 public endpoint;

    /// @notice Struct to encapsulate test parameters.
    struct TestParams {
        address receiver;   ///< @dev Address of the receiver application.
        uint32 srcEid;      ///< @dev Source Endpoint ID.
        bytes32 sender;     ///< @dev Sender application address encoded as bytes32.
        uint64 nonce;       ///< @dev Nonce for the message.
        bytes payload;      ///< @dev Payload data.
        uint256 msgValue;   ///< @dev Ether value sent with the message.
        bytes32 guid;       ///< @dev GUID for the message.
        bytes extraData;    ///< @dev Additional data.
    }

    /// @notice Struct to manage storage slot computations.
    struct StorageSlots {
        uint256 baseSlotLazyInboundNonce;   ///< @dev Base slot for `lazyInboundNonce`.
        uint256 baseSlotInboundPayloadHash; ///< @dev Base slot for `inboundPayloadHash`.
        bytes32 lazyInboundNonceSlot;       ///< @dev Computed storage slot for `lazyInboundNonce`.
        bytes32 inboundPayloadHashSlot;     ///< @dev Computed storage slot for `inboundPayloadHash`.
        bytes32 payloadHash;                ///< @dev Computed payload hash.
        bytes32 isRegisteredLibrarySlot;    ///< @dev Computed storage slot for `isRegisteredLibrary`.
    }

    /// @notice Constant representing an empty payload hash.
    bytes32 internal constant EMPTY_PAYLOAD_HASH = bytes32(0);

    /// @notice Sets up the test environment by forking the mainnet and initializing the EndpointV2 contract.
    function setUp() public {
        /*
            ================================================
            CONFIGURATION FOR DIFFERENT CHAINS
            ================================================
            
            To test the EndpointV2 contract on a different chain, follow these steps:

            1. **Identify the Target Chain's RPC URL:**
               - Obtain the RPC URL for the desired blockchain network (e.g., Binance Smart Chain, Polygon, Avalanche).
               - You can use providers like Infura, Alchemy, or public RPC endpoints.
            
            2. **Identify the EndpointV2 Contract Address on the Target Chain:**
               - Ensure that the EndpointV2 contract is deployed on the target chain.
               - Obtain the deployed contract's address from official sources, deployment scripts, or block explorers.
            
            3. **Update the Fork and Contract Address:**
               - Replace the RPC URL in `createSelectFork` with the target chain's RPC endpoint.
               - Replace the EndpointV2 contract address with the one deployed on the target chain.
            
            4. **Adjust Test Parameters Accordingly:**
               - Ensure that the `receiver` and `sender` addresses are valid on the target chain.
               - Update `srcEid` if it represents the source Endpoint ID specific to the target chain.

            ================================================
        */

        // Fork the Ethereum mainnet using the specified RPC URL.
        vm.createSelectFork("https://mainnet.gateway.tenderly.co");

        // Initialize the EndpointV2 contract instance at the deployed address.
        endpoint = ILayerZeroEndpointV2(0x1a44076050125825900e736c501f859c50fE728c);
    }

    /// @notice Computes the storage slot for `lazyInboundNonce` based on the provided parameters.
    /// @param _receiver The address of the receiver.
    /// @param _srcEid The source Endpoint ID.
    /// @param _sender The sender address encoded as bytes32.
    /// @param baseSlot The base storage slot for `lazyInboundNonce`.
    /// @return The computed storage slot as bytes32.
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
    /// @param _receiver The address of the receiver.
    /// @param _srcEid The source Endpoint ID.
    /// @param _sender The sender address encoded as bytes32.
    /// @param _nonce The nonce for the message.
    /// @param baseSlot The base storage slot for `inboundPayloadHash`.
    /// @return The computed storage slot as bytes32.
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

    /// @notice Tests the `lzReceive` function of the LayerZero EndpointV2 contract.
    /// @dev This test sets the necessary storage slots and invokes `lzReceive`, expecting it to execute successfully.
    function test_lzReceive_gas() public {

        /*
            ================================================
            CONFIGURATION FOR TEST PARAMETERS
            ================================================
            
            To test the `lzReceive` function on a different chain, ensure that the `TestParams` are correctly configured:
            
            1. **Receiver Address (`receiver`):**
               - Set to the address intended to receive the message on the target chain.
               - Ensure this address is valid and can interact with the EndpointV2 contract.
            
            2. **Source Endpoint ID (`srcEid`):**
               - Represents the source Endpoint ID specific to the LayerZero protocol.
               - Ensure this ID corresponds to the source chain you are simulating.
            
            3. **Sender Address (`sender`):**
               - The address of the sender encoded as `bytes32`.
               - Typically, this should be the application address interacting with the EndpointV2 contract.
            
            4. **Nonce (`nonce`):**
               - Initially set to `0` and will be dynamically updated based on the current nonce in storage.
            
            5. **Payload (`payload`):**
               - The data being sent with the message.
               - Ensure this matches the expected format for `lzReceive`.
               - Example: hex"YourPayloadDataHere"
            
            6. **Ether Value (`msgValue`):**
               - The amount of Ether to send with the message.
               - Adjust based on the requirements of the `lzReceive` function.
               - Example: 0.05 ether
            
            7. **GUID (`guid`):**
               - A unique identifier for the message.
               - Typically generated off-chain and passed as a parameter.
            
            8. **Extra Data (`extraData`):**
               - Additional data that might be required by the `lzReceive` function.
               - Can be left empty if not needed.

            ================================================
        */
        TestParams memory params = TestParams({
            receiver: 0x5182feDE730b31a9CF7f49C5781214B4a99F2370, // Receiver address (EOA)
            srcEid: 30312, // Source Endpoint ID
            sender: bytes32(uint256(uint160(0xe4103e80c967f58591a1d7cA443ed7E392FeD862))), // Sender as bytes32
            nonce: 0, // Will be set dynamically
            payload: hex"0000000000000000000000005406b73ae14ab37e2a8a9f57c8c1ab443d8baa5d000000000020aa2c", // Payload data
            msgValue: 0.01 ether, // Ether value to send with the message
            guid: 0x77ed8435178044051ed70a214215e3acdff2d64fb0bb7b4dde514b8e45693d0b, // GUID
            extraData: "" // Additional data
        });

        // Initialize storage slot computations.
        StorageSlots memory slots = StorageSlots({
            baseSlotLazyInboundNonce: 1, // Base slot for `lazyInboundNonce`
            baseSlotInboundPayloadHash: 2, // Base slot for `inboundPayloadHash`
            lazyInboundNonceSlot: bytes32(0),
            inboundPayloadHashSlot: bytes32(0),
            payloadHash: bytes32(0),
            isRegisteredLibrarySlot: bytes32(0)
        });

        // Compute the storage slot for `lazyInboundNonce`.
        slots.lazyInboundNonceSlot = computeLazyInboundNonceSlot(
            params.receiver,
            params.srcEid,
            params.sender,
            slots.baseSlotLazyInboundNonce
        );

        // Read the current `lazyInboundNonce` from storage.
        bytes32 storedNonceBytes = vm.load(address(endpoint), slots.lazyInboundNonceSlot);
        uint64 currentNonce = uint64(uint256(storedNonceBytes));
        emit log_named_uint("Current Lazy Inbound Nonce", currentNonce);

        // Set the incoming nonce to `currentNonce + 1`.
        params.nonce = currentNonce + 1;

        // Compute the storage slot for `inboundPayloadHash` using the new nonce.
        slots.inboundPayloadHashSlot = computeInboundPayloadHashSlot(
            params.receiver,
            params.srcEid,
            params.sender,
            params.nonce,
            slots.baseSlotInboundPayloadHash
        );

        // Compute the payload hash based on `guid` and `payload`.
        slots.payloadHash = keccak256(abi.encodePacked(params.guid, params.payload));

        // Set the `inboundPayloadHash` in storage.
        vm.store(address(endpoint), slots.inboundPayloadHashSlot, slots.payloadHash);

        // Update `lazyInboundNonce` to the new nonce in storage.
        vm.store(address(endpoint), slots.lazyInboundNonceSlot, bytes32(uint256(params.nonce)));

        // Compute the storage slot for `isRegisteredLibrary[sender]` at base slot 5.
        slots.isRegisteredLibrarySlot = keccak256(abi.encode(params.sender, uint256(5)));
        // Set `isRegisteredLibrary[sender]` to `true` in storage.
        vm.store(address(endpoint), slots.isRegisteredLibrarySlot, bytes32(uint256(1)));

        // Verify the updated storage values.
        {
            bytes32 storedNonceAfter = vm.load(address(endpoint), slots.lazyInboundNonceSlot);
            bytes32 storedPayloadHash = vm.load(address(endpoint), slots.inboundPayloadHashSlot);
            bytes32 storedIsRegisteredLibrary = vm.load(address(endpoint), slots.isRegisteredLibrarySlot);

            assertEq(uint256(storedNonceAfter), params.nonce, "Nonce mismatch"); // Should be `currentNonce + 1`
            assertEq(storedPayloadHash, slots.payloadHash, "Payload hash mismatch");
            assertEq(uint256(storedIsRegisteredLibrary), 1, "isRegisteredLibrary mismatch");

            // Log the stored hashes for verification.
            emit log_named_bytes32("Stored Payload Hash", storedPayloadHash);
            emit log_named_bytes32("Computed Payload Hash", slots.payloadHash);
            emit log_named_uint("isRegisteredLibrary[sender]", uint256(storedIsRegisteredLibrary));
        }

        // Prepare the `Origin` struct for the `lzReceive` function.
        Origin memory origin = Origin({
            srcEid: params.srcEid,
            sender: params.sender,
            nonce: params.nonce
        });

        // Capture gas usage.
        uint256 gasBefore = gasleft();

        // Record the Ether balance of the receiver before invoking `lzReceive`.
        uint256 receiverBalanceBeforeCall = address(params.receiver).balance;

        // Call `lzReceive` and handle potential reverts.
        try endpoint.lzReceive{ value: params.msgValue }(
            origin,
            params.receiver,
            params.guid,
            params.payload,
            params.extraData
        ) {
            // If `lzReceive` executes successfully, log the success message.
            emit log("lzReceive executed successfully.");
        } catch (bytes memory reason) {
            // If `lzReceive` reverts, decode and log the error.
            if (reason.length < 4) {
                emit log("Revert without reason");
            } else {
                bytes4 selector;
                assembly {
                    selector := mload(add(reason, 32))
                }

                if (selector == 0xc09b6350) { // LZ_InvalidNonce(uint64)
                    // Decode the uint64 nonce.
                    if (reason.length >= 36) { // 4 bytes selector + 32 bytes data
                        uint64 invalidNonce = abi.decode(slice(reason, 4, 36), (uint64));
                        emit log_named_uint("Invalid Nonce", invalidNonce);
                    } else {
                        emit log("InvalidNonce error data too short");
                    }
                } else if (selector == 0x7182306f) { // LZ_PayloadHashNotFound(bytes32,bytes32)
                    // Decode the expected and actual payload hashes.
                    if (reason.length >= 68) { // 4 bytes selector + 64 bytes data
                        (bytes32 expectedHash, bytes32 actualHash) = abi.decode(slice(reason, 4, 68), (bytes32, bytes32));
                        emit log_named_bytes32("Expected Payload Hash", expectedHash);
                        emit log_named_bytes32("Actual Payload Hash", actualHash);
                    } else {
                        emit log("PayloadHashNotFound error data too short");
                    }
                } else {
                    // Log unknown error selectors and raw revert data.
                    emit log_bytes(reason);
                }
            }

            // Revert the test with a descriptive message.
            revert("lzReceive failed with a revert.");
        }

        // Record the Ether balance of the receiver after invoking `lzReceive`.
        uint256 applicationBalanceAfterCall = address(params.receiver).balance;

        // Calculate the retained `msg.value`.
        uint256 retainedMsgValue = applicationBalanceAfterCall - receiverBalanceBeforeCall;

        // Calculate and log the gas used.
        uint256 gasAfter = gasleft();
        uint256 gasUsed = gasBefore - gasAfter;
        emit log_named_uint("Gas used", gasUsed);

        // Emit the retained `msg.value`.
        emit log_named_uint("msg.value leftover", retainedMsgValue);
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
}