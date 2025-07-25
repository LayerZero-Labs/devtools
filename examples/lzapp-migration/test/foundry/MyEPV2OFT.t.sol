// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Test, console } from "forge-std/Test.sol";
import { MyEPV2Mock } from "../../contracts/mocks/MyEPV2Mock.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppReceiver.sol";
import { BytesLib } from "solidity-bytes-utils/contracts/BytesLib.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

contract MyEPV2OFTTest is Test {
    using BytesLib for bytes;

    MyEPV2Mock oft;
    address endpoint = address(0x1234);
    address delegate = address(0x5678);

    // Test addresses
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    // Test parameters
    uint32 srcEid = 10001;
    bytes32 guid = keccak256("test-guid");

    function setUp() public {
        // Mock the endpoint
        vm.mockCall(endpoint, abi.encodeWithSignature("setDelegate(address)"), "");

        // Deploy the OFT mock
        oft = new MyEPV2Mock("Test OFT", "TOFT", endpoint, delegate);
    }

    function test_V1_PT_SEND_Detection() public {
        // Create a V1 PT_SEND message: [packetType(1)][toAddress(32)][amountSD(8)] = 41 bytes
        bytes memory v1Message = abi.encodePacked(
            uint8(0), // PT_SEND
            bytes32(uint256(uint160(alice))), // toAddress padded to 32 bytes
            uint64(100) // amountSD
        );

        assertEq(v1Message.length, 41, "V1 PT_SEND message should be 41 bytes");
        assertTrue(oft.isV1Message(v1Message), "Should detect as V1 message");

        console.log("V1 PT_SEND message detected correctly");
    }

    function test_V1_PT_SEND_AND_CALL_Detection() public {
        // Create a V1 PT_SEND_AND_CALL message
        bytes memory payload = abi.encode("Hello");
        bytes memory v1Message = abi.encodePacked(
            uint8(1), // PT_SEND_AND_CALL
            bytes32(uint256(uint160(alice))), // toAddress
            uint64(100), // amountSD
            bytes32(uint256(uint160(bob))), // from address
            uint64(200000), // dstGasForCall
            payload
        );

        assertTrue(v1Message.length >= 81, "V1 PT_SEND_AND_CALL message should be at least 81 bytes");
        assertTrue(oft.isV1Message(v1Message), "Should detect as V1 message");

        console.log("V1 PT_SEND_AND_CALL message detected correctly");
    }

    function test_V2_NoCompose_NotDetectedAsV1() public {
        // Create a V2 message without compose: [sendTo(32)][amountSD(8)] = 40 bytes
        bytes memory v2Message = abi.encodePacked(
            bytes32(uint256(uint160(alice))), // sendTo
            uint64(100) // amountSD
        );

        assertEq(v2Message.length, 40, "V2 no-compose message should be 40 bytes");
        assertFalse(oft.isV1Message(v2Message), "Should NOT detect as V1 message");

        console.log("V2 no-compose message correctly NOT detected as V1");
    }

    function test_V2_WithCompose_NotDetectedAsV1() public {
        // Create a V2 message with compose
        bytes memory composePayload = abi.encode("Compose data");
        bytes memory v2Message = abi.encodePacked(
            bytes32(uint256(uint160(alice))), // sendTo
            uint64(100), // amountSD
            bytes32(uint256(uint160(bob))), // sender
            composePayload
        );

        assertTrue(v2Message.length >= 72, "V2 compose message should be at least 72 bytes");
        assertFalse(oft.isV1Message(v2Message), "Should NOT detect as V1 message");

        console.log("V2 compose message correctly NOT detected as V1");
    }

    function test_EdgeCase_V2_81BytesWithZeroStart() public {
        // Edge case: V2 message that is 81+ bytes and starts with 0x00
        address sendToWithZero = address(0x0000000000000000000000000000000000001234);
        bytes memory composePayload = new bytes(45); // Make it large enough to be 81+ bytes total
        bytes memory v2Message = abi.encodePacked(
            bytes32(uint256(uint160(sendToWithZero))), // sendTo starting with zeros
            uint64(100), // amountSD
            bytes32(uint256(uint160(bob))), // sender
            composePayload
        );

        assertTrue(v2Message.length >= 81, "Message is 81+ bytes");
        assertEq(uint8(v2Message[0]), 0, "First byte is 0");
        assertFalse(oft.isV1Message(v2Message), "Should NOT detect as V1 message");

        console.log("Edge case: 81+ byte V2 message starting with 0 correctly NOT detected as V1");
    }

    function test_V1_PT_SEND_Processing() public {
        // Mint tokens to the OFT contract for testing
        deal(address(oft), address(oft), 1000 ether);

        // Create a V1 PT_SEND message
        bytes memory v1Message = abi.encodePacked(
            uint8(0), // PT_SEND
            bytes32(uint256(uint160(alice))), // toAddress
            uint64(100) // amountSD
        );

        Origin memory origin = Origin({ srcEid: srcEid, sender: bytes32(uint256(uint160(address(this)))), nonce: 1 });

        // Mock the endpoint.sendCompose call
        vm.mockCall(endpoint, abi.encodeWithSignature("sendCompose(address,bytes32,uint16,bytes)"), "");

        // Process the V1 message
        vm.expectEmit(true, false, true, true);
        emit OFTReceived(guid, srcEid, alice, oft.toLD(100));

        oft.handleV1Message(origin, guid, v1Message);

        // Check alice received tokens
        assertGt(oft.balanceOf(alice), 0, "Alice should have received tokens");
    }

    function test_SD_LD_Conversion() public {
        // Test SD to LD conversion
        uint64 amountSD = 100;
        uint256 amountLD = oft.toLD(amountSD);
        console.log("SD to LD: ", amountSD, " -> ", amountLD);

        // Test LD to SD conversion
        uint256 testAmountLD = 1000000;
        uint64 resultSD = oft.toSD(testAmountLD);
        console.log("LD to SD: ", testAmountLD, " -> ", resultSD);

        // Verify round trip conversion (accounting for dust)
        uint256 roundTripLD = oft.toLD(oft.toSD(testAmountLD));
        assertLe(roundTripLD, testAmountLD, "Round trip should not increase amount");
    }

    function test_lzReceive_V1_PT_SEND() public {
        // Setup: Set peer for the source endpoint
        vm.mockCall(endpoint, abi.encodeWithSignature("setConfig(address,address,(uint32,uint32,bytes)[])"), "");
        bytes32 peer = bytes32(uint256(uint160(address(this))));
        oft.setPeer(srcEid, peer);

        // Mint tokens to the OFT contract
        deal(address(oft), address(oft), 1000 ether);

        // Create a V1 PT_SEND message
        bytes memory v1Message = abi.encodePacked(
            uint8(0), // PT_SEND
            bytes32(uint256(uint160(alice))), // toAddress
            uint64(100) // amountSD
        );

        Origin memory origin = Origin({ srcEid: srcEid, sender: peer, nonce: 1 });

        // Call lzReceive as the endpoint
        vm.prank(endpoint);
        vm.expectEmit(true, false, true, true);
        emit OFTReceived(guid, srcEid, alice, oft.toLD(100));

        oft.lzReceiveExternal(origin, guid, v1Message, address(0), "");

        // Verify alice received tokens
        assertGt(oft.balanceOf(alice), 0, "Alice should have received tokens");
    }

    function test_lzReceive_V1_PT_SEND_AND_CALL() public {
        // Setup: Set peer for the source endpoint
        vm.mockCall(endpoint, abi.encodeWithSignature("setConfig(address,address,(uint32,uint32,bytes)[])"), "");
        bytes32 peer = bytes32(uint256(uint160(address(this))));
        oft.setPeer(srcEid, peer);

        // Mint tokens to the OFT contract
        deal(address(oft), address(oft), 1000 ether);

        // Create a V1 PT_SEND_AND_CALL message
        bytes memory payload = abi.encode("Hello from V1");
        bytes memory v1Message = abi.encodePacked(
            uint8(1), // PT_SEND_AND_CALL
            bytes32(uint256(uint160(alice))), // toAddress
            uint64(100), // amountSD
            bytes32(uint256(uint160(bob))), // from address
            uint64(200000), // dstGasForCall
            payload
        );

        Origin memory origin = Origin({ srcEid: srcEid, sender: peer, nonce: 1 });

        // Mock the endpoint.sendCompose call
        vm.mockCall(endpoint, abi.encodeWithSignature("sendCompose(address,bytes32,uint16,bytes)"), "");

        // Call lzReceive as the endpoint
        vm.prank(endpoint);
        vm.expectEmit(true, false, true, true);
        emit OFTReceived(guid, srcEid, alice, oft.toLD(100));

        oft.lzReceiveExternal(origin, guid, v1Message, address(0), "");

        // Verify alice received tokens
        assertGt(oft.balanceOf(alice), 0, "Alice should have received tokens");
    }

    function test_lzReceive_V2_PT_SEND() public {
        // Setup: Set peer for the source endpoint
        vm.mockCall(endpoint, abi.encodeWithSignature("setConfig(address,address,(uint32,uint32,bytes)[])"), "");
        bytes32 peer = bytes32(uint256(uint160(address(this))));
        oft.setPeer(srcEid, peer);

        // Mint tokens to the OFT contract
        deal(address(oft), address(oft), 1000 ether);

        // Create a V2 message without compose
        bytes memory v2Message = abi.encodePacked(
            bytes32(uint256(uint160(alice))), // sendTo
            uint64(100) // amountSD
        );

        Origin memory origin = Origin({ srcEid: srcEid, sender: peer, nonce: 1 });

        // Call lzReceive as the endpoint
        vm.prank(endpoint);
        vm.expectEmit(true, false, true, true);
        emit OFTReceived(guid, srcEid, alice, oft.toLD(100));

        oft.lzReceiveExternal(origin, guid, v2Message, address(0), "");

        // Verify alice received tokens
        assertGt(oft.balanceOf(alice), 0, "Alice should have received tokens");
    }

    function test_lzReceive_V2_PT_SEND_AND_CALL() public {
        // Setup: Set peer for the source endpoint
        vm.mockCall(endpoint, abi.encodeWithSignature("setConfig(address,address,(uint32,uint32,bytes)[])"), "");
        bytes32 peer = bytes32(uint256(uint160(address(this))));
        oft.setPeer(srcEid, peer);

        // Mint tokens to the OFT contract
        deal(address(oft), address(oft), 1000 ether);

        // Create a V2 message with compose
        bytes memory composePayload = abi.encode("Compose data");
        bytes memory v2Message = abi.encodePacked(
            bytes32(uint256(uint160(alice))), // sendTo
            uint64(100), // amountSD
            bytes32(uint256(uint160(bob))), // sender
            composePayload
        );

        Origin memory origin = Origin({ srcEid: srcEid, sender: peer, nonce: 1 });

        // Call lzReceive as the endpoint
        vm.prank(endpoint);
        vm.expectEmit(true, false, true, true);
        emit OFTReceived(guid, srcEid, alice, oft.toLD(100));

        oft.lzReceiveExternal(origin, guid, v2Message, address(0), "");

        // Verify alice received tokens
        assertGt(oft.balanceOf(alice), 0, "Alice should have received tokens");
    }

    // Send tests - V1/V2 message encoding

    function test_V1_Endpoint_Ranges() public pure {
        // Test the endpoint ID ranges for V1 detection

        // V1 Mainnet range (101-199)
        assertTrue(isV1Endpoint(101), "101 should be V1 (Ethereum mainnet)");
        assertTrue(isV1Endpoint(102), "102 should be V1 (BSC mainnet)");
        assertTrue(isV1Endpoint(106), "106 should be V1 (Avalanche mainnet)");
        assertTrue(isV1Endpoint(199), "199 should be V1 (upper bound)");
        assertFalse(isV1Endpoint(100), "100 should not be V1");
        assertFalse(isV1Endpoint(200), "200 should not be V1");

        // V1 Testnet range (10001-10999)
        assertTrue(isV1Endpoint(10001), "10001 should be V1 (Goerli)");
        assertTrue(isV1Endpoint(10002), "10002 should be V1 (BSC testnet)");
        assertTrue(isV1Endpoint(10106), "10106 should be V1 (Fuji)");
        assertTrue(isV1Endpoint(10999), "10999 should be V1 (upper bound)");
        assertFalse(isV1Endpoint(10000), "10000 should not be V1");
        assertFalse(isV1Endpoint(11000), "11000 should not be V1");

        // V2 endpoints
        assertFalse(isV1Endpoint(30101), "30101 should not be V1 (Ethereum V2)");
        assertFalse(isV1Endpoint(40106), "40106 should not be V1 (Fuji V2)");
    }

    function test_V1_Message_Encoding_PT_SEND() public {
        // Test direct message encoding for V1 PT_SEND
        uint32 v1Eid = 101;
        uint256 amountLD = 1 ether;

        SendParam memory sendParam = SendParam({
            dstEid: v1Eid,
            to: bytes32(uint256(uint160(alice))),
            amountLD: amountLD,
            minAmountLD: amountLD,
            extraOptions: "",
            composeMsg: "",
            oftCmd: ""
        });

        (bytes memory message, ) = oft.buildMsgAndOptions(sendParam, amountLD);

        // Verify V1 PT_SEND format: [packetType(1)][toAddress(32)][amountSD(8)]
        assertEq(message.length, 41, "V1 PT_SEND message should be 41 bytes");
        assertEq(uint8(message[0]), 0, "First byte should be PT_SEND (0)");

        // Extract and verify toAddress
        bytes32 encodedTo = message.toBytes32(1);
        assertEq(encodedTo, bytes32(uint256(uint160(alice))), "To address should match");

        // Extract and verify amountSD
        uint64 encodedAmountSD = message.toUint64(33);
        assertEq(encodedAmountSD, oft.toSD(amountLD), "Amount SD should match");

        console.log("V1 PT_SEND message length:", message.length);
        console.log("Packet type:", uint8(message[0]));
    }

    function test_V1_Message_Encoding_PT_SEND_AND_CALL() public {
        // Test direct message encoding for V1 PT_SEND_AND_CALL
        uint32 v1Eid = 10001;
        uint256 amountLD = 1 ether;
        bytes memory composeMsg = abi.encode("Test compose");

        SendParam memory sendParam = SendParam({
            dstEid: v1Eid,
            to: bytes32(uint256(uint160(alice))),
            amountLD: amountLD,
            minAmountLD: amountLD,
            extraOptions: "",
            composeMsg: composeMsg,
            oftCmd: ""
        });

        (bytes memory message, ) = oft.buildMsgAndOptions(sendParam, amountLD);

        // Verify V1 PT_SEND_AND_CALL format
        assertTrue(message.length >= 81, "V1 PT_SEND_AND_CALL should be at least 81 bytes");
        assertEq(uint8(message[0]), 1, "First byte should be PT_SEND_AND_CALL (1)");

        // Extract and verify components
        bytes32 encodedTo = message.toBytes32(1);
        assertEq(encodedTo, bytes32(uint256(uint160(alice))), "To address should match");

        uint64 encodedAmountSD = message.toUint64(33);
        assertEq(encodedAmountSD, oft.toSD(amountLD), "Amount SD should match");

        bytes32 encodedFrom = message.toBytes32(41);
        assertEq(encodedFrom, bytes32(uint256(uint160(address(this)))), "From address should be msg.sender");

        uint64 dstGasForCall = message.toUint64(73);
        assertEq(dstGasForCall, 200000, "Default gas should be 200000");

        // Extract payload
        bytes memory extractedPayload = message.slice(81, message.length - 81);
        assertEq(keccak256(extractedPayload), keccak256(composeMsg), "Payload should match");

        console.log("V1 PT_SEND_AND_CALL message length:", message.length);
        console.log("Packet type:", uint8(message[0]));
        console.log("Gas for call:", dstGasForCall);
    }

    function test_V2_Message_Encoding() public {
        // Test that V2 endpoints use standard encoding
        uint32 v2Eid = 30101;
        uint256 amountLD = 1 ether;

        SendParam memory sendParam = SendParam({
            dstEid: v2Eid,
            to: bytes32(uint256(uint160(alice))),
            amountLD: amountLD,
            minAmountLD: amountLD,
            extraOptions: "",
            composeMsg: "",
            oftCmd: ""
        });

        (bytes memory message, ) = oft.buildMsgAndOptions(sendParam, amountLD);

        // V2 format without compose: [sendTo(32)][amountSD(8)] = 40 bytes
        assertEq(message.length, 40, "V2 message without compose should be 40 bytes");

        // V2 doesn't have packet type as first byte
        bytes32 encodedSendTo = message.toBytes32(0);
        assertEq(encodedSendTo, bytes32(uint256(uint160(alice))), "SendTo should be at start");

        console.log("V2 message length:", message.length);
    }

    function test_buildMsgAndOptions_V1_Send_Integration() public {
        // Test V1 mainnet endpoint (101 = Ethereum mainnet V1)
        uint32 v1MainnetEid = 101;
        uint256 amountLD = 1 ether;

        // Set peer for the destination
        oft.setPeer(v1MainnetEid, bytes32(uint256(uint160(address(0xDEAD)))));

        SendParam memory sendParam = SendParam({
            dstEid: v1MainnetEid,
            to: bytes32(uint256(uint160(alice))),
            amountLD: amountLD,
            minAmountLD: amountLD,
            extraOptions: "",
            composeMsg: "",
            oftCmd: ""
        });

        // Test the message building directly
        (bytes memory message, bytes memory options) = oft.buildMsgAndOptions(sendParam, amountLD);

        // Verify the message is in V1 format
        assertEq(message.length, 41, "V1 PT_SEND message should be 41 bytes");
        assertEq(uint8(message[0]), 0, "First byte should be PT_SEND (0)");

        console.log("V1 message successfully built for endpoint", v1MainnetEid);
        console.log("Message length:", message.length);
        console.log("Options length:", options.length);
    }

    // Helper function to check if an endpoint is V1
    function isV1Endpoint(uint32 eid) internal pure returns (bool) {
        return (eid >= 101 && eid <= 199) || (eid >= 10001 && eid <= 10999);
    }

    // Event from OFT
    event OFTReceived(bytes32 indexed guid, uint32 srcEid, address indexed toAddress, uint256 amountReceivedLD);
}
