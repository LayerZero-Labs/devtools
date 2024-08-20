// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { SendConfig } from "@layerzerolabs/ua-devtools-evm-foundry/src/SendConfig.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTMock } from "@layerzerolabs/oft-evm/test/mocks/OFTMock.sol";
import { UlnConfig, SetDefaultUlnConfigParam } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { TestHelperOz5, EndpointV2 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";
import { SendUln302Mock } from "@layerzerolabs/test-devtools-evm-foundry/contracts/mocks/SendUln302Mock.sol";

// Forge imports
import "forge-std/console.sol";
import { Test } from "forge-std/Test.sol";

contract SendConfigTest is Test {
    EndpointV2 endpoint;
    SendConfig private sendConfig;

    uint32 private aEid = 1;
    uint32 private remoteEid = 2;

    uint256 private constant TREASURY_GAS_CAP = 1000000;
    uint256 private constant TREASURY_GAS_FOR_FEE_CAP = 1000000;

    OFTMock private myOFT;
    SendUln302Mock private sendLib;

    address private userA = address(0x1);

    address private dvnAddress = address(0x2);

    function setUp() public virtual {
        vm.prank(userA);
        endpoint = new EndpointV2(remoteEid, userA);

        sendLib = new SendUln302Mock(payable(address(this)), address(endpoint), TREASURY_GAS_CAP, TREASURY_GAS_FOR_FEE_CAP);

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
        sendLib.setDefaultUlnConfigs(ulnParams);

        vm.prank(userA);
        endpoint.registerLibrary(address(sendLib));

        myOFT = new OFTMock("MyOFT", "OFT", address(endpoint), userA);

        sendConfig = new SendConfig();
    }

    function test_run_updates_send_config(uint64 _confirmations, address[] memory _requiredDvns, uint32 _maxMessageSize, address _executor) public {
        vm.assume(_confirmations > 0 && _confirmations < type(uint64).max);

        // Set required DVNs to a realistic length
        vm.assume(_requiredDvns.length <= 5);

        UlnConfig memory ulnConfig = UlnConfig({
            confirmations: _confirmations,
            requiredDVNs: sortAddresses(_requiredDvns),
            requiredDVNCount: uint8(_requiredDvns.length),
            optionalDVNCount: 0,
            optionalDVNs: new address[](0),
            optionalDVNThreshold: 0
        });

        ExecutorConfig memory executorConfig = ExecutorConfig({ maxMessageSize: _maxMessageSize, executor: _executor});

        sendConfig.run(address(myOFT), remoteEid, address(sendLib), address(userA), ulnConfig, executorConfig);

        // Verify that the send configuration was set correctly
        bytes memory updatedUlnConfigBytes = endpoint.getConfig(address(myOFT), address(sendLib), remoteEid, sendConfig.ULN_CONFIG_TYPE());
        UlnConfig memory updatedUlnConfig = abi.decode(updatedUlnConfigBytes, (UlnConfig));
        
        assertEq(updatedUlnConfig.confirmations, ulnConfig.confirmations);

        // TODO - Fix this test
        // assertEq(updatedUlnConfig.requiredDVNCount, uint8(ulnConfig.requiredDVNCount));
        // assertEq(updatedUlnConfig.requiredDVNs.length, ulnConfig.requiredDVNs.length);

        // for (uint i = 0; i < ulnConfig.requiredDVNs.length; i++) {
        //     assertEq(updatedUlnConfig.requiredDVNs[i], ulnConfig.requiredDVNs[i]);
        // }

        // assertEq(updatedUlnConfig.optionalDVNCount, ulnConfig.optionalDVNCount);
        // assertEq(updatedUlnConfig.optionalDVNs.length, ulnConfig.optionalDVNs.length);

        // for (uint i = 0; i < ulnConfig.optionalDVNs.length; i++) {
        //     assertEq(updatedUlnConfig.optionalDVNs[i], ulnConfig.optionalDVNs[i]);
        // }

        // assertEq(updatedUlnConfig.optionalDVNThreshold, ulnConfig.optionalDVNThreshold);

        bytes memory updatedExecutorConfigBytes = endpoint.getConfig(address(myOFT), address(sendLib), remoteEid, sendConfig.EXECUTOR_CONFIG_TYPE());
        (ExecutorConfig memory updatedExecutorConfig) = abi.decode(updatedExecutorConfigBytes, (ExecutorConfig));

        assertEq(updatedExecutorConfig.maxMessageSize, executorConfig.maxMessageSize);
        assertEq(updatedExecutorConfig.executor, executorConfig.executor);
    }

    // TODO place this in a helper class?
    function sortAddresses(address[] memory arr) internal pure returns (address[] memory) {
        uint256 length = arr.length;
        for (uint256 i = 0; i < length; i++) {
            for (uint256 j = 0; j < length - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    // Swap elements if they are in the wrong order
                    address temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }
}