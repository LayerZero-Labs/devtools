// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { IPreCrime, PreCrimePeer } from "../contracts/precrime/interfaces/IPreCrime.sol";
import { InboundPacket } from "../contracts/precrime/libs/Packet.sol";

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { PreCrimeV2Mock } from "./mocks/PreCrimeV2Mock.sol";
import { PreCrimeV2SimulatorMock } from "./mocks/PreCrimeV2SimulatorMock.sol";

contract PreCrimeV2Test is TestHelperOz5 {
    uint8 constant DEFAULT_NUM_PEERS = 3;
    uint64 constant DEFAULT_MAX_BATCH_SIZE = 4;

    uint32 constant EID_B = 2;
    uint32 constant EID_C = 3;
    bytes32 constant SENDER_B = 0x0000000000000000000000000000000000000000000000000000000000000002;
    bytes32 constant SENDER_C = 0x0000000000000000000000000000000000000000000000000000000000000003;

    uint32 constant DST_EID = 1;

    uint16 constant CONFIG_VERSION = 2;
    uint64 constant MAX_BATCH_SIZE = 4;
    address constant OFF_CHAIN = address(0xDEAD);

    PreCrimeV2Mock preCrime;
    PreCrimeV2SimulatorMock simulator;

    PreCrimePeer[] preCrimePeers;

    function setUpPreCrime(uint8 _numPeers, uint64 _maxBatchSize) private {
        setUpEndpoints(_numPeers, LibraryType.SimpleMessageLib);

        simulator = new PreCrimeV2SimulatorMock(address(this));
        preCrime = new PreCrimeV2Mock(address(endpoints[DST_EID]), address(simulator), address(this));

        for (uint8 i = 2; i <= _numPeers; i++) {
            preCrimePeers.push(PreCrimePeer(uint32(i), bytes32(uint256(i)), bytes32(uint256(i))));
        }

        preCrime.setPreCrimePeers(preCrimePeers);
        preCrime.setMaxBatchSize(_maxBatchSize);
    }

    function checkPreCrimeParams(uint8 _numPeers, uint64 _maxBatchSize) private pure {
        vm.assume(_numPeers > 0 && _numPeers <= 10);
        vm.assume(_maxBatchSize >= 1 && _maxBatchSize <= 50);
    }

    function checkAndSetupPreCrime(uint8 _numPeers, uint64 _maxBatchSize) private {
        checkPreCrimeParams(_numPeers, _maxBatchSize);
        setUpPreCrime(_numPeers, _maxBatchSize);
    }

    function setUpDefaultPreCrime() private {
        setUpPreCrime(DEFAULT_NUM_PEERS, DEFAULT_MAX_BATCH_SIZE);
    }

    function test_getConfig_no_packets(uint256[] calldata _packetMsgValues) public {
        setUpDefaultPreCrime();

        // return config with all peers if no packet
        vm.startPrank(OFF_CHAIN);
        bytes memory config = preCrime.getConfig(new bytes[](0), _packetMsgValues);
        bytes memory expectedConfig = abi.encodePacked(CONFIG_VERSION, MAX_BATCH_SIZE, _encodePeers(preCrimePeers));
        assertEq(config, expectedConfig);
    }

    function test_getConfig_untrusted_peer(uint8 _numPeers, uint64 _maxBatchSize, bytes32 _untrustedPeer) public {
        checkAndSetupPreCrime(_numPeers, _maxBatchSize);
        // ensure the fuzzed address is not a multiple of ADDRESS_MULTIPLIER
        vm.assume(uint256(_untrustedPeer) == 0 || uint256(_untrustedPeer) > _numPeers);

        // return config without peers if packet from untrusted peer
        bytes[] memory packets = _buildPacket(2, _untrustedPeer, 1, 1); // untrusted peer
        vm.startPrank(OFF_CHAIN);
        bytes memory config = preCrime.getConfig(packets, new uint256[](1));
        bytes memory expectedConfig = abi.encodePacked(CONFIG_VERSION, _maxBatchSize);
        assertEq(config, expectedConfig);
    }

    function test_getConfig_trusted_peer(uint8 _numPeers, uint64 _maxBatchSize) public {
        vm.assume(_numPeers > 1);
        checkAndSetupPreCrime(_numPeers, _maxBatchSize);

        // return config with peers if packet from trusted peer
        for (uint8 i = 2; i <= _numPeers; i++) {
            bytes[] memory packets = _buildPacket(i, bytes32(uint256(i)), 1, 1); // trusted peer
            vm.startPrank(OFF_CHAIN);
            bytes memory config = preCrime.getConfig(packets, new uint256[](1));
            bytes memory expectedConfig = abi.encodePacked(CONFIG_VERSION, _maxBatchSize, _encodePeers(preCrimePeers));
            assertEq(config, expectedConfig);
        }
    }

    function test_simulate_packetOverSize(uint64 _batchSize) public {
        vm.assume(_batchSize > 0 && _batchSize < 1000);
        setUpPreCrime(DEFAULT_NUM_PEERS, _batchSize);

        uint256[] memory packetMsgValues = new uint256[](_batchSize + 1);
        bytes[] memory packets = _buildPacket(2, bytes32(uint256(2)), 1, _batchSize + 1); // too many packets
        vm.startPrank(OFF_CHAIN);
        bytes memory expectedError = abi.encodeWithSelector(
            IPreCrime.PacketOversize.selector,
            _batchSize,
            _batchSize + 1
        );
        vm.expectRevert(expectedError);
        preCrime.simulate(packets, packetMsgValues);
    }

    // Sets up a test scenario to ensure input packets are ordered and not interleaved. There are 4 peers:
    // A: dstEid = 1
    // B: srcEid = 2, sender = 0x0000000000000000000000000000000000000000000000000000000000000002
    // C: srcEid = 3, sender = 0x0000000000000000000000000000000000000000000000000000000000000003
    // The test then calls simulate() with:
    // 1. numPacketsB from B to A starting at startingNonceB
    // 2. numPacketsC from C to A starting at startingNonceC
    // 3. One packet from B to A starting at startingNonceB + numPacketsB + 1
    // PacketUnsorted is expected.
    function test_simulate_packetUnsorted_interleaving_peers(
        uint8 _numPacketsB,
        uint64 _startingNonceB,
        uint8 _numPacketsC,
        uint64 _startingNonceC
    ) public {
        // numPacketsA and numPacketsB must be positive in order to cause interleaving
        vm.assume(_numPacketsB > 0);
        vm.assume(_numPacketsC > 0);

        // calculate the last nonce sent by B and C, ensuring that the container does not overflow
        uint128 endingNonceB = (uint128(_startingNonceB) + uint128(_numPacketsB));
        uint128 endingNonceC = (uint128(_startingNonceC) + uint128(_numPacketsC));
        vm.assume(endingNonceB < type(uint64).max);
        vm.assume(endingNonceC < type(uint64).max);

        uint64 totalPackets = uint64(_numPacketsB) + uint64(_numPacketsC) + 1; // 1 extra for the interleave at the end

        setUpPreCrime(DEFAULT_NUM_PEERS, totalPackets);

        uint256[] memory packetMsgValues = new uint256[](totalPackets);
        bytes[] memory unsortedPackets = new bytes[](totalPackets);

        // B -> A
        bytes[] memory sortedPacketsB = _buildPacket(EID_B, SENDER_B, _startingNonceB, _numPacketsB);
        assertEq(sortedPacketsB.length, _numPacketsB);
        uint256 j = 0;
        for (uint256 i = 0; i < _numPacketsB; i++) {
            unsortedPackets[j++] = sortedPacketsB[i];
        }
        // C -> A
        bytes[] memory sortedPacketsC = _buildPacket(EID_C, SENDER_C, _startingNonceC, _numPacketsC);
        assertEq(sortedPacketsC.length, _numPacketsC);
        for (uint256 i = 0; i < _numPacketsC; i++) {
            unsortedPackets[j++] = sortedPacketsC[i];
        }
        // B -> A (interleaved)
        unsortedPackets[j++] = _buildPacket(EID_B, SENDER_B, _startingNonceB + _numPacketsB + 1, 1)[0]; // unsorted

        vm.startPrank(OFF_CHAIN);
        bytes memory expectedError = abi.encodeWithSelector(IPreCrime.PacketUnsorted.selector);
        vm.expectRevert(expectedError);
        preCrime.simulate(unsortedPackets, packetMsgValues);
    }

    function test_simulate_packetUnsorted_one_unordered_peer(
        uint8 _numPacketsB,
        uint64 _startingNonceB,
        uint8 _replaceIndexOffset // added to _startingNonceB to get the index of the packet to replace
    ) public {
        // 1. numPacketsB must be at least 3 to ensure that the replaceIndex is within bounds
        // 2. replaceIndexOffset must be less than numPacketsB to ensure that the replaceIndex is within bounds
        vm.assume(_numPacketsB >= 3);
        vm.assume(_replaceIndexOffset < _numPacketsB - 2);
        // 3. calculate the last nonce sent by B and C, ensuring that the container does not overflow
        uint128 endingNonceB = (uint128(_startingNonceB) + uint128(_numPacketsB));
        vm.assume(endingNonceB < type(uint64).max);
        // 4. calculate the index of the packet to replace
        uint64 replaceIndex = _replaceIndexOffset + _startingNonceB;
        vm.assume(replaceIndex > _startingNonceB && replaceIndex < endingNonceB - 2);

        setUpPreCrime(DEFAULT_NUM_PEERS, _numPacketsB);

        uint256[] memory packetMsgValues = new uint256[](_numPacketsB);
        bytes[] memory unsortedPackets = _buildPacket(EID_B, SENDER_B, _startingNonceB, _numPacketsB);
        unsortedPackets[replaceIndex - _startingNonceB] = _encodePacket(
            InboundPacket(
                Origin(EID_B, SENDER_B, 0),
                DST_EID,
                address(uint160(uint256(SENDER_B))), //preCrime.oApp(),
                bytes32(0), // guid
                0, // value
                address(0), // executor
                "", // message
                "" // extraData
            )
        );

        vm.startPrank(OFF_CHAIN);
        bytes memory expectedError = abi.encodeWithSelector(IPreCrime.PacketUnsorted.selector);
        vm.expectRevert(expectedError);
        preCrime.simulate(unsortedPackets, packetMsgValues);
    }

    function test_simulate_failed() public {
        uint32 invalidPeerEid = 0; // see PrecrimeV2SimulatorMock, which hardcodes eid=0 as InvalidEid
        setUpDefaultPreCrime();

        // empty packetMsgValues to be reused
        uint256[] memory packetMsgValues = new uint256[](1);
        bytes[] memory packets = _buildPacket(invalidPeerEid, bytes32(0), 1, 1); // invalid packet and simulation failed
        vm.startPrank(OFF_CHAIN);
        bytes memory expectedError = abi.encodeWithSelector(
            IPreCrime.SimulationFailed.selector,
            abi.encodeWithSelector(PreCrimeV2SimulatorMock.InvalidEid.selector)
        );
        vm.expectRevert(expectedError);
        preCrime.simulate(packets, packetMsgValues);
    }

    function test_simulate(uint8 _numPacketsB, uint8 _numPacketsC) public {
        vm.assume(_numPacketsB > 0 && _numPacketsC > 0);
        uint64 totalPackets = uint32(_numPacketsB) + uint32(_numPacketsC);
        setUpPreCrime(DEFAULT_NUM_PEERS, totalPackets);

        uint256[] memory packetMsgValues = new uint256[](totalPackets);
        bytes[] memory packets = _buildPacket(EID_B, SENDER_B, 1, _numPacketsB);
        packets = _appendPackets(packets, _buildPacket(EID_C, SENDER_C, 1, _numPacketsC));
        assertEq(packets.length, totalPackets);

        vm.startPrank(OFF_CHAIN);
        bytes memory result = preCrime.simulate(packets, packetMsgValues);
        bytes memory expectedResult = abi.encodePacked(DST_EID, uint256(totalPackets));
        assertEq(result, expectedResult);
    }

    function test_preCrime_simulationResultNotFound() public {
        setUpDefaultPreCrime();

        uint256[] memory packetMsgValues = new uint256[](1);
        bytes[] memory packets = _buildPacket(2, bytes32(uint256(2)), 1, 1);

        // result of eid 3 not found
        bytes[] memory results = new bytes[](2);
        results[0] = abi.encodePacked(uint32(1), uint256(1));
        results[1] = abi.encodePacked(uint32(2), uint256(1));

        vm.startPrank(OFF_CHAIN);
        bytes memory expectedError = abi.encodeWithSelector(IPreCrime.SimulationResultNotFound.selector, 3);
        vm.expectRevert(expectedError);
        preCrime.preCrime(packets, packetMsgValues, results);

        // result of eid 1 (local result) not found
        results[0] = abi.encodePacked(uint32(2), uint256(1));
        results[1] = abi.encodePacked(uint32(3), uint256(1));

        expectedError = abi.encodeWithSelector(IPreCrime.SimulationResultNotFound.selector, 1);
        vm.expectRevert(expectedError);
        preCrime.preCrime(packets, packetMsgValues, results);
    }

    function test_preCrime() public {
        setUpDefaultPreCrime();

        uint256[] memory packetMsgValues = new uint256[](1);
        bytes[] memory packets = _buildPacket(2, bytes32(uint256(2)), 1, 1);

        bytes[] memory results = new bytes[](3);
        results[0] = abi.encodePacked(uint32(1), uint256(1));
        results[1] = abi.encodePacked(uint32(2), uint256(2));
        results[2] = abi.encodePacked(uint32(3), uint256(3));

        vm.startPrank(OFF_CHAIN);
        preCrime.preCrime(packets, packetMsgValues, results);

        // check internal state of preCrime
        assertEq(preCrime.eids(0), 1);
        assertEq(preCrime.eids(1), 2);
        assertEq(preCrime.eids(2), 3);
        assertEq(preCrime.results(0), abi.encode(1));
        assertEq(preCrime.results(1), abi.encode(2));
        assertEq(preCrime.results(2), abi.encode(3));
    }

    function _buildPacket(
        uint32 _srcEid,
        bytes32 _sender,
        uint64 _nonce,
        uint256 _numPackets
    ) internal view returns (bytes[] memory) {
        bytes[] memory packets = new bytes[](_numPackets);
        for (uint256 i = 0; i < _numPackets; ++i) {
            InboundPacket memory packet = InboundPacket(
                Origin(_srcEid, _sender, _nonce + uint64(i)),
                DST_EID,
                preCrime.oApp(),
                bytes32(0), // guid
                0, // value
                address(0), // executor
                "", // message
                "" // extraData
            );
            packets[i] = _encodePacket(packet);
        }
        return packets;
    }

    function _encodePacket(InboundPacket memory _packet) internal pure returns (bytes memory encodedPacket) {
        encodedPacket = abi.encodePacked(
            uint8(1),
            _packet.origin.nonce,
            _packet.origin.srcEid,
            _packet.origin.sender,
            _packet.dstEid,
            bytes32(uint256(uint160(_packet.receiver))),
            _packet.guid,
            _packet.value,
            _packet.message
        );
    }

    function _appendPackets(
        bytes[] memory _packets,
        bytes[] memory _newPackets
    ) internal pure returns (bytes[] memory) {
        bytes[] memory packets = new bytes[](_packets.length + _newPackets.length);
        for (uint256 i = 0; i < _packets.length; ++i) {
            packets[i] = _packets[i];
        }
        for (uint256 i = 0; i < _newPackets.length; ++i) {
            packets[_packets.length + i] = _newPackets[i];
        }
        return packets;
    }

    function _encodePeers(PreCrimePeer[] memory _peers) internal pure returns (bytes memory) {
        bytes memory peers = abi.encodePacked(uint16(_peers.length));
        for (uint256 i = 0; i < _peers.length; ++i) {
            peers = abi.encodePacked(peers, _peers[i].eid, _peers[i].preCrime, _peers[i].oApp);
        }
        return peers;
    }
}
