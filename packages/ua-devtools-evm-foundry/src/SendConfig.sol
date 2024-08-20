// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

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
        // MyOFT myOFT = new MyOFT("MyOFT", "OFT", address(0x6EDCE65403992e310A62460808c4b910D972f10f), address(0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7)); 

        MyOFT myOFT = MyOFT(contractAddress);

        ILayerZeroEndpointV2 endpoint = ILayerZeroEndpointV2(address(myOFT.endpoint()));
        
        address sendLibraryAddress = endpoint.getSendLibrary(address(myOFT), remoteEid);

        console.log("============================ PREPARING SEND CONFIG ============================");

        ExecutorConfig memory executorConfig = ExecutorConfig({ maxMessageSize: 50, executor: 0x71d7a02cDD38BEa35E42b53fF4a42a37638a0066});
        UlnConfig memory ulnConfig = UlnConfig({
                                    confirmations: 99,
                                    requiredDVNs: new address[](0),
                                    requiredDVNCount: 0,
                                    optionalDVNCount: 0,
                                    optionalDVNs: new address[](0),
                                    optionalDVNThreshold: 0
                                });

        SetConfigParam[] memory setSendConfigParams = new SetConfigParam[](2);
        
        setSendConfigParams[0] = SetConfigParam({
            eid: remoteEid,
            configType: EXECUTOR_CONFIG_TYPE,
            config: abi.encode(executorConfig)
        });

        setSendConfigParams[1] = SetConfigParam({
            eid: remoteEid,
            configType: ULN_CONFIG_TYPE,
            config: abi.encode(ulnConfig)
        });

        console.log("============================ SETTING SEND CONFIG ============================");

        vm.startBroadcast(deployerPrivateKey);

        endpoint.setConfig(address(myOFT), sendLibraryAddress, setSendConfigParams);

        vm.stopBroadcast();

        console.log("============================ GETTING UPDATED SEND CONFIG ============================");
        
        bytes memory updatedExecutorConfigBytes = endpoint.getConfig(address(myOFT), sendLibraryAddress, remoteEid, EXECUTOR_CONFIG_TYPE);
        (ExecutorConfig memory updatedExecutorConfig) = abi.decode(updatedExecutorConfigBytes, (ExecutorConfig));

        console.log("updatedExecutorConfig.maxMessageSize");
        console.logUint(updatedExecutorConfig.maxMessageSize);

        bytes memory updatedUlnConfigBytes = endpoint.getConfig(address(myOFT), sendLibraryAddress, remoteEid, ULN_CONFIG_TYPE);
        (UlnConfig memory updatedUlnConfig) = abi.decode(updatedUlnConfigBytes, (UlnConfig));
        
        console.log("updatedUlnConfig.confirmations");
        console.logUint(updatedUlnConfig.confirmations);
    }
}