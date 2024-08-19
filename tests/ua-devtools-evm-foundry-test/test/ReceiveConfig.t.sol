// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ReceiveConfig } from "@layerzerolabs/ua-devtools-evm-foundry/src/ReceiveConfig.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTMock } from "@layerzerolabs/oft-evm/test/mocks/OFTMock.sol";
import { UlnConfig, SetDefaultUlnConfigParam } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { TestHelperOz5, EndpointV2 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { ReceiveUln302Mock } from "@layerzerolabs/test-devtools-evm-foundry/contracts/mocks/ReceiveUln302Mock.sol";

// Forge imports
import "forge-std/console.sol";
import { Test } from "forge-std/Test.sol";

contract ReceiveConfigTest is Test {
    EndpointV2 endpoint;
    ReceiveConfig private receiveConfig;

    uint32 private aEid = 1;
    uint32 private remoteEid = 2;

    OFTMock private myOFT;
    ReceiveUln302Mock private receiveLib;

    address private userA = address(0x1);

    address private dvnAddress = address(0x2);

    uint256 private initialBalance = 1000 ether;

    function setUp() public virtual {
        vm.deal(userA, initialBalance);

        vm.prank(userA);
        endpoint = new EndpointV2(remoteEid, userA);

        receiveLib = new ReceiveUln302Mock(address(endpoint));

        address[] memory defaultDVNs = new address[](1);
        defaultDVNs[0] = dvnAddress;

        SetDefaultUlnConfigParam[] memory ulnParams = new SetDefaultUlnConfigParam[](1);
        UlnConfig memory ulnConfig = UlnConfig(
            100,
            uint8(defaultDVNs.length),
            uint8(0),
            0,
            defaultDVNs,
            new address[](0)
        );

        ulnParams[0] = SetDefaultUlnConfigParam(remoteEid, ulnConfig);
        receiveLib.setDefaultUlnConfigs(ulnParams);

        vm.prank(userA);
        endpoint.registerLibrary(address(receiveLib));

        console.log("===== LIBRARY REGISTERED =====");

        myOFT = new OFTMock("MyOFT", "OFT", address(endpoint), userA);

        receiveConfig = new ReceiveConfig();
    }

    function test_run() public {
        // TODO test this with realistic values
        UlnConfig memory ulnConfig = UlnConfig({
            confirmations: 59,
            requiredDVNs: new address[](0),
            requiredDVNCount: 0,
            optionalDVNCount: 0,
            optionalDVNs: new address[](0),
            optionalDVNThreshold: 0
        });

        receiveConfig.run(address(myOFT), remoteEid, address(receiveLib), address(userA), ulnConfig);

        // Verify that the receive configuration was set correctly
        bytes memory updatedUlnConfigBytes = endpoint.getConfig(address(myOFT), address(receiveLib), remoteEid, receiveConfig.RECEIVE_CONFIG_TYPE());
        UlnConfig memory updatedUlnConfig = abi.decode(updatedUlnConfigBytes, (UlnConfig));
        
        assertEq(updatedUlnConfig.confirmations, 59);
    }
}