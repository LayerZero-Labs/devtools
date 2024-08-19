// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import "../contracts/MyOFT.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";

contract SendConfig is Script {
    uint32 public constant EXECUTOR_CONFIG_TYPE = 1;
    uint32 public constant ULN_CONFIG_TYPE = 2;

    function run(address contractAddress, uint32 remoteEid) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // ============================ Can deploy contract or fetch deployed contract ============================
        // MyOFT myOFT = new MyOFT("ravina", "RG", address(0x6EDCE65403992e310A62460808c4b910D972f10f), address(0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7)); 

        MyOFT myOFT = MyOFT(contractAddress);

        ILayerZeroEndpointV2 endpoint = ILayerZeroEndpointV2(address(myOFT.endpoint()));

        console.log("============================ Send Library Address ============================");
        address sendLibraryAddress = endpoint.getSendLibrary(address(myOFT), remoteEid);
        console.logAddress(sendLibraryAddress);

        console.log("============================ SETTING SEND CONFIG ============================");

        SetConfigParam[] memory setSendConfigParams = new SetConfigParam[](2);
        setSendConfigParams[0] = SetConfigParam({
            eid: remoteEid,
            configType: EXECUTOR_CONFIG_TYPE,
            config: abi.encode(ExecutorConfig({
                                    maxMessageSize: 50,
                                    executor: 0x71d7a02cDD38BEa35E42b53fF4a42a37638a0066
                                }))
        });

        setSendConfigParams[1] = SetConfigParam({
            eid: remoteEid,
            configType: ULN_CONFIG_TYPE,
            config: abi.encode(UlnConfig({
                                    confirmations: 99,
                                    requiredDVNs: new address[](0),
                                    requiredDVNCount: 0,
                                    optionalDVNCount: 0,
                                    optionalDVNs: new address[](0),
                                    optionalDVNThreshold: 0
                                }))
        });

        vm.startBroadcast(deployerPrivateKey);

        endpoint.setConfig(address(myOFT), sendLibraryAddress, setSendConfigParams);

        vm.stopBroadcast();

        console.log("Done setting send config");

        console.log("============================ GETTING SEND CONFIG ============================");
        bytes memory updatedSendExecutorConfigBytes = endpoint.getConfig(address(myOFT), sendLibraryAddress, remoteEid, EXECUTOR_CONFIG_TYPE);
        (ExecutorConfig memory updatedSendExecutorConfig) = abi.decode(updatedSendExecutorConfigBytes, (ExecutorConfig));

        console.log("updatedSendExecutorConfig.maxMessageSize");
        console.logUint(updatedSendExecutorConfig.maxMessageSize);

        bytes memory updatedSendUlnConfigBytes = endpoint.getConfig(address(myOFT), sendLibraryAddress, remoteEid, ULN_CONFIG_TYPE);
        (UlnConfig memory updatedSendUlnConfig) = abi.decode(updatedSendUlnConfigBytes, (UlnConfig));
        
        console.log("updatedSendUlnConfig.confirmations");
        console.logUint(updatedSendUlnConfig.confirmations);
    }
}