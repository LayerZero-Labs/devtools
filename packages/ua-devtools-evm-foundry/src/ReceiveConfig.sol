// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";

contract ReceiveConfig is Script {
    uint32 public constant RECEIVE_CONFIG_TYPE = 2;

    function run(address contractAddress, uint32 remoteEid) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // ============================ Can deploy contract or fetch deployed contract ============================
        // OFT myOFT = new OFT("MyOFT", "OFT", address(0x6EDCE65403992e310A62460808c4b910D972f10f), address(0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7)); 

        OFT myOFT = OFT(contractAddress);

        ILayerZeroEndpointV2 endpoint = ILayerZeroEndpointV2(address(myOFT.endpoint()));
        
        (address receiveLibraryAddress, ) = endpoint.getReceiveLibrary(address(myOFT), remoteEid);

        console.log("============================ PREPARING RECEIVE CONFIG ============================");
        
        UlnConfig memory receiveConfig = UlnConfig({
                confirmations: 59,
                requiredDVNs: new address[](0),
                requiredDVNCount: 0,
                optionalDVNCount: 0,
                optionalDVNs: new address[](0),
                optionalDVNThreshold: 0
            });

        SetConfigParam[] memory setReceiveConfigParams = new SetConfigParam[](1);
        setReceiveConfigParams[0] = SetConfigParam({
            eid: remoteEid,
            configType: 2,
            config: abi.encode(receiveConfig)
        });

        console.log("============================ SETTING RECEIVE CONFIG ============================");

        vm.startBroadcast(deployerPrivateKey);

        endpoint.setConfig(address(myOFT), receiveLibraryAddress, setReceiveConfigParams);

        vm.stopBroadcast();

        console.log("============================ GETTING UPDATED RECEIVE CONFIG ============================");
        
        bytes memory updatedUlnConfigBytes = endpoint.getConfig(address(myOFT), receiveLibraryAddress, remoteEid, 2);
        UlnConfig memory updatedUlnConfig = abi.decode(updatedUlnConfigBytes, (UlnConfig));
        
        console.log(" Updated Uln Config Confirmations: ");
        console.logUint(updatedUlnConfig.confirmations);
    }
}

/**

- Create a new package called `ua-devtools-evm-foundry`
- Put your scripts into the `src` directory
- Add this package as a depenendecy to `toolbox-foundry`
- Update the build `Makefile` to include this package
- Create a new test package called `ua-devtools-evm-foundry-test`
- Setup foundry for this package
- Add an OFT contract and script files that extend the script files from `ua-devtools-evm-foundry`
- Add a test file that deploys the OFT and configures it using your scripts
 */