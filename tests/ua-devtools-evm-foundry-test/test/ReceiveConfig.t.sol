// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// LayerZero imports
import { EndpointV2 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTMock } from "@layerzerolabs/oft-evm/test/mocks/OFTMock.sol";
import { ReceiveConfig } from "@layerzerolabs/ua-devtools-evm-foundry/src/ReceiveConfig.sol";
import { ReceiveUln302Mock } from "@layerzerolabs/test-devtools-evm-foundry/contracts/mocks/ReceiveUln302Mock.sol";
import { SetDefaultUlnConfigParam, UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";

// Forge imports
import "forge-std/console.sol";
import { Test } from "forge-std/Test.sol";

import "../utils/Helpers.sol";

contract ReceiveConfigTest is Test {
    EndpointV2 endpoint;
    ReceiveConfig private receiveConfig;

    uint32 private aEid = 1;
    uint32 private remoteEid = 2;

    OFTMock private myOFT;
    ReceiveUln302Mock private receiveLib;

    address private userA = address(0x1);

    address private dvnAddress = address(0x2);

    function setUp() public virtual {
        vm.prank(userA);
        endpoint = new EndpointV2(remoteEid, userA);

        // register receive library and set default ULN config
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

        myOFT = new OFTMock("MyOFT", "OFT", address(endpoint), userA);

        receiveConfig = new ReceiveConfig();
    }

    function test_run_updates_receive_config(uint64 _confirmations, address[] memory _requiredDvns) public {
        vm.assume(_confirmations > 0 && _confirmations < type(uint64).max);
        // Set required DVNs to a realistic length and ensure they are sorted and unique
        vm.assume(_requiredDvns.length > 0 && _requiredDvns.length <= 5 && Helpers.isSortedAndUnique(_requiredDvns));

        UlnConfig memory ulnConfig = UlnConfig({
            confirmations: _confirmations,
            requiredDVNs: Helpers.sortAddresses(_requiredDvns),
            requiredDVNCount: uint8(_requiredDvns.length),
            optionalDVNCount: 0,
            optionalDVNs: new address[](0),
            optionalDVNThreshold: 0
        });

        receiveConfig.run(address(myOFT), remoteEid, address(receiveLib), address(userA), ulnConfig);

        // Verify that the receive configuration was set correctly
        bytes memory updatedUlnConfigBytes = endpoint.getConfig(address(myOFT), address(receiveLib), remoteEid, receiveConfig.RECEIVE_CONFIG_TYPE());
        UlnConfig memory updatedUlnConfig = abi.decode(updatedUlnConfigBytes, (UlnConfig));
        
        assertEq(updatedUlnConfig.confirmations, ulnConfig.confirmations);
        assertEq(updatedUlnConfig.requiredDVNCount, uint8(ulnConfig.requiredDVNCount));
        assertEq(updatedUlnConfig.requiredDVNs.length, ulnConfig.requiredDVNs.length);

        for (uint i = 0; i < ulnConfig.requiredDVNs.length; i++) {
            assertEq(updatedUlnConfig.requiredDVNs[i], ulnConfig.requiredDVNs[i]);
        }

        assertEq(updatedUlnConfig.optionalDVNCount, ulnConfig.optionalDVNCount);
        assertEq(updatedUlnConfig.optionalDVNs.length, ulnConfig.optionalDVNs.length);

        for (uint i = 0; i < ulnConfig.optionalDVNs.length; i++) {
            assertEq(updatedUlnConfig.optionalDVNs[i], ulnConfig.optionalDVNs[i]);
        }

        assertEq(updatedUlnConfig.optionalDVNThreshold, ulnConfig.optionalDVNThreshold);
    }
}
