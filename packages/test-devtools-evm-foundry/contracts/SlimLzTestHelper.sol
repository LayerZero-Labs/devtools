// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// Forge
import { Test } from "forge-std/Test.sol";
import "forge-std/console.sol";

// Oz
import { DoubleEndedQueue } from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

// Protocol
import { Origin, ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";
import { ExecutorOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/libs/ExecutorOptions.sol";

// Minimal Mocks
import { EndpointV2Simple as EndpointV2 } from "./mocks/EndpointV2Simple.sol";
import { SlimSimpleMessageLibMock } from "./mocks/SlimSimpleMessageLibMock.sol";
import { OptionsHelper } from "./OptionsHelper.sol";

interface IOAppSetPeer {
    function setPeer(uint32 _eid, bytes32 _peer) external;
    function endpoint() external view returns (ILayerZeroEndpointV2 iEndpoint);
}

/**
 * @title SlimLzTestHelper
 * @notice Lightweight helper contract for basic LayerZero OApp testing without compile size issues
 * @dev Maintains backward compatibility with TestHelperOz5 for basic testing scenarios.
 * For advanced features (DVN, Executor, workers), use TestHelperOz5 instead.
 */
contract SlimLzTestHelper is Test, OptionsHelper {
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;
    using PacketV1Codec for bytes;
    
    // ==================== Custom Errors ====================
    
    /// @notice Thrown when trying to verify packets for an unregistered endpoint
    /// @param eid The endpoint ID that was not found
    error SlimLzTestHelper_EndpointNotRegistered(uint32 eid);
    
    /// @notice Thrown when native drop transfer fails
    /// @param receiver The address that failed to receive native tokens
    /// @param amount The amount that failed to transfer
    error SlimLzTestHelper_NativeDropFailed(address receiver, uint256 amount);
    
    /// @notice Thrown when packet GUID doesn't match expected value
    /// @param expected The expected GUID value
    /// @param actual The actual GUID value found in packet
    error SlimLzTestHelper_GuidMismatch(bytes32 expected, bytes32 actual);
    
    /// @notice Thrown when packet validation fails
    /// @param guid The GUID of the packet that failed validation
    error SlimLzTestHelper_PacketValidationFailed(bytes32 guid);
    
    /// @notice Thrown when attempting to schedule a packet with duplicate GUID
    /// @param guid The duplicate GUID that was detected
    error SlimLzTestHelper_DuplicateGuid(bytes32 guid);

    enum LibraryType {
        UltraLightNode,
        SimpleMessageLib
    }

    // Maintain same data structures for compatibility
    struct EndpointSetup {
        EndpointV2[] endpointList;
        uint32[] eidList;
        address[] sendLibs;
        address[] receiveLibs;
        address[] readLibs;
        address[] signers;
        address priceFeed; // Simplified - just address
    }

    // Core mappings
    mapping(uint32 => mapping(bytes32 => DoubleEndedQueue.Bytes32Deque)) packetsQueue;
    mapping(bytes32 => bytes) packets;
    mapping(bytes32 => bytes) optionsLookup;
    mapping(uint32 => address) endpoints;

    uint128 public executorValueCap = 0.1 ether;

    // Maintain same visibility as TestHelperOz5
    EndpointSetup internal endpointSetup;

    /// @notice Initializes test environment setup
    function setUp() public virtual {
        _setUpUlnOptions();
    }

    /**
     * @notice Sets the maximum value that can be passed to lzReceive() calls
     * @dev Default is 0.1 ether, call this to increase if needed
     * 
     * @param _valueCap The new maximum value cap
     */
    function setExecutorValueCap(uint128 _valueCap) public {
        executorValueCap = _valueCap;
    }

    /**
     * @notice Sets up endpoints for testing
     * @dev Creates endpoints and configures them with SimpleMessageLib
     * 
     * @param _endpointNum Number of endpoints to create
     */
    function setUpEndpoints(uint8 _endpointNum) public {
        // In slim version, we always use SimpleMessageLib
        
        endpointSetup.endpointList = new EndpointV2[](_endpointNum);
        endpointSetup.eidList = new uint32[](_endpointNum);
        endpointSetup.sendLibs = new address[](_endpointNum);
        endpointSetup.receiveLibs = new address[](_endpointNum);
        endpointSetup.readLibs = new address[](_endpointNum);
        endpointSetup.signers = new address[](1);
        endpointSetup.signers[0] = vm.addr(1);

        // Deploy endpoints
        for (uint8 i = 0; i < _endpointNum; i++) {
            uint32 eid = i + 1;
            endpointSetup.eidList[i] = eid;
            endpointSetup.endpointList[i] = new EndpointV2(eid);
            registerEndpoint(endpointSetup.endpointList[i]);
        }

        // Setup message libraries
        for (uint8 i = 0; i < _endpointNum; i++) {
            address endpointAddr = address(endpointSetup.endpointList[i]);
            
            SlimSimpleMessageLibMock messageLib = new SlimSimpleMessageLibMock(
                payable(this),
                endpointAddr
            );
            
            endpointSetup.endpointList[i].registerLibrary(address(messageLib));
            endpointSetup.sendLibs[i] = address(messageLib);
            endpointSetup.receiveLibs[i] = address(messageLib);
            endpointSetup.readLibs[i] = address(messageLib);
        }

        // Configure endpoints
        for (uint8 i = 0; i < _endpointNum; i++) {
            EndpointV2 endpoint = endpointSetup.endpointList[i];
            for (uint8 j = 0; j < _endpointNum; j++) {
                if (i == j) continue;
                endpoint.setDefaultSendLibrary(j + 1, endpointSetup.sendLibs[i]);
                endpoint.setDefaultReceiveLibrary(j + 1, endpointSetup.receiveLibs[i], 0);
            }
        }
    }

    /**
     * @notice Overload for backward compatibility with LibraryType parameter
     * @dev Library type is ignored - always uses SimpleMessageLib
     * 
     * @param _endpointNum Number of endpoints to create
     */
    function setUpEndpoints(uint8 _endpointNum, LibraryType /* _libraryType */) public {
        setUpEndpoints(_endpointNum);
    }

    /**
     * @notice Deploys an OApp contract
     * @dev Uses CREATE opcode to deploy contract with constructor arguments
     * 
     * @param _oappBytecode The OApp contract bytecode
     * @param _constructorArgs The encoded constructor arguments
     * 
     * @return addr The deployed contract address
     */
    function _deployOApp(bytes memory _oappBytecode, bytes memory _constructorArgs) internal returns (address addr) {
        bytes memory bytecode = bytes.concat(abi.encodePacked(_oappBytecode), _constructorArgs);
        assembly {
            addr := create(0, add(bytecode, 0x20), mload(bytecode))
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
    }

    /**
     * @notice Sets up mock OApp contracts for testing
     * @dev Deploys OApp contracts and wires them together
     * 
     * @param _oappCreationCode The bytecode for creating OApp contracts
     * @param _startEid The starting endpoint ID
     * @param _oappNum The number of OApp contracts to create
     * 
     * @return oapps Array of deployed OApp addresses
     */
    function setupOApps(
        bytes memory _oappCreationCode,
        uint8 _startEid,
        uint8 _oappNum
    ) public returns (address[] memory oapps) {
        oapps = new address[](_oappNum);
        for (uint8 eid = _startEid; eid < _startEid + _oappNum; eid++) {
            address oapp = _deployOApp(_oappCreationCode, abi.encode(address(endpoints[eid]), address(this), true));
            oapps[eid - _startEid] = oapp;
        }
        wireOApps(oapps);
    }

    /**
     * @notice Configures the peers between multiple OApp instances
     * @dev Sets up bidirectional peer relationships between all OApps
     * 
     * @param oapps Array of OApp addresses to wire together
     */
    function wireOApps(address[] memory oapps) public {
        uint256 size = oapps.length;
        for (uint256 i = 0; i < size; i++) {
            IOAppSetPeer localOApp = IOAppSetPeer(oapps[i]);
            for (uint256 j = 0; j < size; j++) {
                if (i == j) continue;
                IOAppSetPeer remoteOApp = IOAppSetPeer(oapps[j]);
                uint32 remoteEid = (remoteOApp.endpoint()).eid();
                localOApp.setPeer(remoteEid, addressToBytes32(address(remoteOApp)));
            }
        }
    }

    /**
     * @notice Schedules a packet for delivery
     * @dev Stores packet and options for later verification. Includes optional duplicate GUID detection.
     * 
     * @param _packetBytes The encoded packet data
     * @param _options The executor options for packet delivery
     */
    function schedulePacket(bytes calldata _packetBytes, bytes calldata _options) public {
        uint32 dstEid = _packetBytes.dstEid();
        bytes32 dstAddress = _packetBytes.receiver();
        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[dstEid][dstAddress];
        bytes32 guid = _packetBytes.guid();
        
        // Optional: Check for duplicate GUIDs (can be disabled if performance is critical)
        if (packets[guid].length > 0) {
            revert SlimLzTestHelper_DuplicateGuid(guid);
        }
        
        queue.pushFront(guid);
        packets[guid] = _packetBytes;
        optionsLookup[guid] = _options;
    }

    /**
     * @notice Verifies and processes all pending packets for a destination
     * @dev Convenience function that processes all packets without compose
     * 
     * @param _dstEid The destination endpoint ID
     * @param _dstAddress The destination address as bytes32
     */
    function verifyPackets(uint32 _dstEid, bytes32 _dstAddress) public {
        verifyPackets(_dstEid, _dstAddress, 0, address(0x0), bytes(""));
    }

    /**
     * @notice Verifies and processes all pending packets for a destination address
     * @dev Convenience function that converts address to bytes32
     * 
     * @param _dstEid The destination endpoint ID
     * @param _dstAddress The destination address
     */
    function verifyPackets(uint32 _dstEid, address _dstAddress) public {
        verifyPackets(_dstEid, bytes32(uint256(uint160(_dstAddress))), 0, address(0x0), bytes(""));
    }

    /**
     * @notice Main packet verification and delivery function
     * @dev Processes packets from queue, executes lzReceive, handles native drops and compose
     * 
     * @param _dstEid The destination endpoint ID
     * @param _dstAddress The destination address as bytes32
     * @param _packetAmount Number of packets to process (0 for all)
     * @param _composer The composer address for lzCompose calls
     * @param _resolvedPayload Payload for packet validation (currently unused)
     */
    function verifyPackets(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes memory _resolvedPayload
    ) public {
        if (endpoints[_dstEid] == address(0)) {
            revert SlimLzTestHelper_EndpointNotRegistered(_dstEid);
        }

        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[_dstEid][_dstAddress];
        uint256 pendingPacketsSize = queue.length();
        uint256 numberOfPackets;
        if (_packetAmount == 0) {
            numberOfPackets = queue.length();
        } else {
            numberOfPackets = pendingPacketsSize > _packetAmount ? _packetAmount : pendingPacketsSize;
        }
        
        while (numberOfPackets > 0 && queue.length() > 0) {
            numberOfPackets--;
            bytes32 guid = queue.popBack();
            bytes memory packetBytes = packets[guid];
            this.assertGuid(packetBytes, guid);
            this.validatePacket(packetBytes, _resolvedPayload);

            bytes memory options = optionsLookup[guid];
            
            // Simplified delivery - just do lzReceive
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZRECEIVE)) {
                this.lzReceive(packetBytes, options);
            }
            
            // Handle native drops
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_NATIVE_DROP)) {
                (uint256 amount, bytes32 receiver) = _parseExecutorNativeDropOption(options);
                address receiverAddress = address(uint160(uint256(receiver)));
                (bool success, ) = receiverAddress.call{value: amount}("");
                if (!success) {
                    revert SlimLzTestHelper_NativeDropFailed(receiverAddress, amount);
                }
            }
            
            // Handle compose if composer specified
            if (_composer != address(0) && _executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZCOMPOSE)) {
                this.lzCompose(packetBytes, options, guid, _composer);
            }
            
            // Clean up storage to prevent memory leaks during testing
            delete packets[guid];
            delete optionsLookup[guid];
        }
    }

    /**
     * @notice Executes lzReceive for a packet
     * @dev Extracts gas and value from options and calls endpoint's lzReceive
     * 
     * @param _packetBytes The encoded packet data
     * @param _options The executor options containing gas and value limits
     */
    function lzReceive(bytes calldata _packetBytes, bytes memory _options) external payable {
        EndpointV2 endpoint = EndpointV2(endpoints[_packetBytes.dstEid()]);
        (uint256 gas, uint256 value) = _parseExecutorLzReceiveOption(_options);

        Origin memory origin = Origin(_packetBytes.srcEid(), _packetBytes.sender(), _packetBytes.nonce());
        endpoint.lzReceive{ value: value, gas: gas }(
            origin,
            _packetBytes.receiverB20(),
            _packetBytes.guid(),
            _packetBytes.message(),
            bytes("")
        );
    }

    /**
     * @notice Executes lzCompose for a packet
     * @dev Convenience wrapper that extracts packet data and calls full lzCompose
     * 
     * @param _packetBytes The encoded packet data
     * @param _options The executor options
     * @param _guid The packet GUID
     * @param _composer The composer address
     */
    function lzCompose(
        bytes calldata _packetBytes,
        bytes memory _options,
        bytes32 _guid,
        address _composer
    ) external payable {
        this.lzCompose(
            _packetBytes.dstEid(),
            _packetBytes.receiverB20(),
            _options,
            _guid,
            _composer,
            _packetBytes.message()
        );
    }

    /**
     * @notice Executes lzCompose with full parameters
     * @dev Extracts gas and value from options and calls endpoint's lzCompose
     * 
     * @param _dstEid The destination endpoint ID
     * @param _from The sender address
     * @param _options The executor options
     * @param _guid The packet GUID
     * @param _to The composer contract address
     * @param _composerMsg The message for the composer
     */
    function lzCompose(
        uint32 _dstEid,
        address _from,
        bytes memory _options,
        bytes32 _guid,
        address _to,
        bytes calldata _composerMsg
    ) external payable {
        EndpointV2 endpoint = EndpointV2(endpoints[_dstEid]);
        (uint16 index, uint256 gas, uint256 value) = _parseExecutorLzComposeOption(_options);
        endpoint.lzCompose{ value: value, gas: gas }(_from, _to, _guid, index, _composerMsg, bytes(""));
    }

    /**
     * @notice Validates a packet
     * @dev Calls the receive library's validatePacket function
     * 
     * @param _packetBytes The encoded packet data
     */
    function validatePacket(bytes calldata _packetBytes, bytes memory /* _resolvedPayload */) external {
        uint32 dstEid = _packetBytes.dstEid();
        EndpointV2 endpoint = EndpointV2(endpoints[dstEid]);
        (address receiveLib, ) = endpoint.getReceiveLibrary(_packetBytes.receiverB20(), _packetBytes.srcEid());
        
        // In slim version, always use SimpleMessageLibMock
        SlimSimpleMessageLibMock(payable(receiveLib)).validatePacket(_packetBytes);
    }

    /**
     * @notice Asserts that a packet's GUID matches the expected value
     * @dev Reverts if GUIDs don't match
     * 
     * @param packetBytes The encoded packet data
     * @param guid The expected GUID
     */
    function assertGuid(bytes calldata packetBytes, bytes32 guid) external pure {
        bytes32 packetGuid = packetBytes.guid();
        if (packetGuid != guid) {
            revert SlimLzTestHelper_GuidMismatch(guid, packetGuid);
        }
    }

    /**
     * @notice Registers an endpoint for testing
     * @dev Maps endpoint ID to endpoint address
     * 
     * @param endpoint The endpoint to register
     */
    function registerEndpoint(EndpointV2 endpoint) public {
        endpoints[endpoint.eid()] = address(endpoint);
    }

    /**
     * @notice Converts an address to bytes32
     * @dev Used for OApp peer configuration
     * 
     * @param _addr The address to convert
     * 
     * @return The address as bytes32
     */
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /// @notice Allows contract to receive native tokens
    receive() external payable {}
}