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

// Minimal Mocks
import { EndpointV2Simple as EndpointV2 } from "./mocks/EndpointV2Simple.sol";
import { SimpleMessageLibMock } from "./mocks/SimpleMessageLibMock.sol";
import { OptionsHelper } from "./OptionsHelper.sol";

interface IOAppSetPeer {
    function setPeer(uint32 _eid, bytes32 _peer) external;
    function endpoint() external view returns (ILayerZeroEndpointV2 iEndpoint);
}

/**
 * @title LzTestHelperSlim
 * @notice Lightweight helper contract for basic LayerZero OApp testing without compile size issues.
 * @dev Maintains backward compatibility with TestHelperOz5 for basic testing scenarios.
 * @dev For advanced features (DVN, Executor, workers), use TestHelperOz5 instead.
 */
contract LzTestHelperSlim is Test, OptionsHelper {
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;
    using PacketV1Codec for bytes;

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

    // Constants
    uint128 public executorValueCap = 0.1 ether;

    // Maintain same visibility as TestHelperOz5
    EndpointSetup internal endpointSetup;

    /// @dev Initializes test environment setup
    function setUp() public virtual {
        _setUpUlnOptions();
    }

    /**
     * @dev set executorValueCap if more than 0.1 ether is necessary
     * @param _valueCap amount executor can pass as msg.value to lzReceive()
     */
    function setExecutorValueCap(uint128 _valueCap) public {
        executorValueCap = _valueCap;
    }

    /**
     * @notice Sets up endpoints - maintains backward compatibility
     * @param _endpointNum Number of endpoints to create
     */
    function setUpEndpoints(uint8 _endpointNum, LibraryType /* _libraryType */) public {
        // In slim version, we always use SimpleMessageLib regardless of _libraryType
        // This maintains API compatibility while simplifying implementation
        
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
            
            SimpleMessageLibMock messageLib = new SimpleMessageLibMock(
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
     * @notice Overload for backward compatibility
     */
    function setUpEndpoints(uint8 _endpointNum) public {
        setUpEndpoints(_endpointNum, LibraryType.SimpleMessageLib);
    }

    /**
     * @notice Sets up mock OApp contracts for testing
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
     * @notice Deploys an OApp contract
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
     * @notice Schedules a packet for delivery
     */
    function schedulePacket(bytes calldata _packetBytes, bytes calldata _options) public {
        uint32 dstEid = _packetBytes.dstEid();
        bytes32 dstAddress = _packetBytes.receiver();
        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[dstEid][dstAddress];
        bytes32 guid = _packetBytes.guid();
        queue.pushFront(guid);
        packets[guid] = _packetBytes;
        optionsLookup[guid] = _options;
    }

    /**
     * @notice Verifies and processes packets
     */
    function verifyPackets(uint32 _dstEid, bytes32 _dstAddress) public {
        verifyPackets(_dstEid, _dstAddress, 0, address(0x0), bytes(""));
    }

    /**
     * @notice Verifies packets by address
     */
    function verifyPackets(uint32 _dstEid, address _dstAddress) public {
        verifyPackets(_dstEid, bytes32(uint256(uint160(_dstAddress))), 0, address(0x0), bytes(""));
    }

    /**
     * @notice Main packet verification and delivery
     */
    function verifyPackets(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes memory _resolvedPayload
    ) public {
        require(endpoints[_dstEid] != address(0), "endpoint not yet registered");

        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[_dstEid][_dstAddress];
        uint256 pendingPacketsSize = queue.length();
        uint256 numberOfPackets;
        if (_packetAmount == 0) {
            numberOfPackets = queue.length();
        } else {
            numberOfPackets = pendingPacketsSize > _packetAmount ? _packetAmount : pendingPacketsSize;
        }
        
        while (numberOfPackets > 0) {
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
                require(success, "Native drop failed");
            }
            
            // Handle compose if composer specified
            if (_composer != address(0) && _executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZCOMPOSE)) {
                this.lzCompose(packetBytes, options, guid, _composer);
            }
        }
    }

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

    function validatePacket(bytes calldata _packetBytes, bytes memory /* _resolvedPayload */) external {
        uint32 dstEid = _packetBytes.dstEid();
        EndpointV2 endpoint = EndpointV2(endpoints[dstEid]);
        (address receiveLib, ) = endpoint.getReceiveLibrary(_packetBytes.receiverB20(), _packetBytes.srcEid());
        
        // In slim version, always use SimpleMessageLibMock
        SimpleMessageLibMock(payable(receiveLib)).validatePacket(_packetBytes);
    }

    function assertGuid(bytes calldata packetBytes, bytes32 guid) external pure {
        bytes32 packetGuid = packetBytes.guid();
        require(packetGuid == guid, "guid not match");
    }

    function registerEndpoint(EndpointV2 endpoint) public {
        endpoints[endpoint.eid()] = address(endpoint);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    receive() external payable {}
}

// Import ExecutorOptions for compatibility
import { ExecutorOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/libs/ExecutorOptions.sol"; 