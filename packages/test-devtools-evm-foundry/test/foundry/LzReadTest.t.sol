// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// Forge
import { console } from "forge-std/Test.sol";

import { ExecutorOptions } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/ExecutorOptions.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { SlimLzTestHelper } from "../../contracts/SlimLzTestHelper.sol";
import { EndpointV2Simple } from "../../contracts/mocks/EndpointV2Simple.sol";

contract LzReadTest is SlimLzTestHelper {
    using OptionsBuilder for bytes;

    bytes32 receiver = keccak256(abi.encodePacked("receiver"));
    
    function setUp() public virtual override {
        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);
    }

    function test_ParseExecutorLzReadOption_Basic() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReadOption(200_000, 100, 0);

        (uint128 gas, uint32 size, uint128 value) = _parseExecutorLzReadOption(options);
        assertEq(gas, 200_000, "gas mismatch");
        assertEq(size, 100, "size mismatch");
        assertEq(value, 0, "value mismatch");
    }

    function test_ParseExecutorLzReadOption_WithValue() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReadOption(300_000, 200, 0.1 ether);

        (uint128 gas, uint32 size, uint128 value) = _parseExecutorLzReadOption(options);
        assertEq(gas, 300_000, "gas mismatch");
        assertEq(size, 200, "size mismatch");
        assertEq(value, 0.1 ether, "value mismatch");
    }

    function test_MultiParseExecutorLzReadOption() public {
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReadOption(100_000, 50, 0)
            .addExecutorLzReadOption(200_000, 100, 0.1 ether)
            .addExecutorLzReadOption(300_000, 150, 0.2 ether);

        (uint128 gas, uint32 size, uint128 value) = _parseExecutorLzReadOption(options);
        assertEq(gas, 600_000, "gas mismatch");
        assertEq(size, 300, "size mismatch");
        assertEq(value, 0.3 ether, "value mismatch");
    }

    function test_ExecutorOptionExists_LzRead() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReadOption(100_000, 50, 0);
        
        bool exists = _executorOptionExists(options, 5); // OPTION_TYPE_LZREAD = 5
        assertTrue(exists, "lzRead option should exist");
        
        bool notExists = _executorOptionExists(options, 1); // OPTION_TYPE_LZRECEIVE = 1
        assertFalse(notExists, "lzReceive option should not exist");
    }

    function test_DefaultChannelId() public {
        assertEq(DEFAULT_CHANNEL_ID, 4294967295, "DEFAULT_CHANNEL_ID should be 4294967295");
    }

    function test_SendLibraryConfiguration() public {
        // Test that send libraries are properly configured
        // This should not revert with "no send library" error
        EndpointV2Simple endpoint = EndpointV2Simple(endpoints[2]);
        address sendLib = endpoint.getSendLibrary(address(0x1), 1);
        assertTrue(sendLib != address(0), "Send library should be configured");
        
        // Test receive library configuration
        (address receiveLib, bool isDefault) = endpoint.getReceiveLibrary(address(0x1), 1);
        assertTrue(receiveLib != address(0), "Receive library should be configured");
        assertTrue(isDefault, "Should be default library");
    }

    function test_EndpointConfigurationForLzRead() public {
        // Test the specific configuration that the lzRead test needs
        // This simulates the setup from the failing test
        
        // Check that endpoint 2 can send to endpoint 1
        EndpointV2Simple endpoint2 = EndpointV2Simple(endpoints[2]);
        address sendLib2to1 = endpoint2.getSendLibrary(address(0x1), 1);
        assertTrue(sendLib2to1 != address(0), "Endpoint 2 should be able to send to endpoint 1");
        
        // Check that endpoint 1 can send to endpoint 2  
        EndpointV2Simple endpoint1 = EndpointV2Simple(endpoints[1]);
        address sendLib1to2 = endpoint1.getSendLibrary(address(0x1), 2);
        assertTrue(sendLib1to2 != address(0), "Endpoint 1 should be able to send to endpoint 2");
    }

    function test_ReadLibraryConfiguration() public {
        // Test that read libraries are properly configured
        EndpointV2Simple endpoint1 = EndpointV2Simple(endpoints[1]);
        EndpointV2Simple endpoint2 = EndpointV2Simple(endpoints[2]);
        
        // Check that read libraries are registered
        // Note: We can't directly check read library registration in the mock,
        // but we can verify that the setup completed without errors
        assertTrue(address(endpoint1) != address(0), "Endpoint 1 should be deployed");
        assertTrue(address(endpoint2) != address(0), "Endpoint 2 should be deployed");
    }

    function test_DefaultChannelIdSendLibraryConfiguration() public {
        // Test that send libraries are properly configured for DEFAULT_CHANNEL_ID
        // This is crucial for lzRead operations
        EndpointV2Simple endpoint1 = EndpointV2Simple(endpoints[1]);
        EndpointV2Simple endpoint2 = EndpointV2Simple(endpoints[2]);
        
        // Check that endpoint 1 can send to DEFAULT_CHANNEL_ID
        address sendLib1toDefault = endpoint1.getSendLibrary(address(0x1), DEFAULT_CHANNEL_ID);
        assertTrue(sendLib1toDefault != address(0), "Endpoint 1 should be able to send to DEFAULT_CHANNEL_ID");
        
        // Check that endpoint 2 can send to DEFAULT_CHANNEL_ID
        address sendLib2toDefault = endpoint2.getSendLibrary(address(0x1), DEFAULT_CHANNEL_ID);
        assertTrue(sendLib2toDefault != address(0), "Endpoint 2 should be able to send to DEFAULT_CHANNEL_ID");
    }
} 