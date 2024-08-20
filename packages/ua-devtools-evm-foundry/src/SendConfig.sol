// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// Forge imports
import "forge-std/console.sol";
import "forge-std/Script.sol";

// LayerZero imports
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";

contract SendConfig is Script {
    uint32 public constant EXECUTOR_CONFIG_TYPE = 1;
    uint32 public constant ULN_CONFIG_TYPE = 2;

    function run(address contractAddress, uint32 remoteEid, address sendLibraryAddress, address signer, UlnConfig calldata ulnConfig, ExecutorConfig calldata executorConfig) external {
        OFT myOFT = OFT(contractAddress);

        ILayerZeroEndpointV2 endpoint = ILayerZeroEndpointV2(address(myOFT.endpoint()));

        SetConfigParam[] memory setConfigParams = new SetConfigParam[](2);
        
        setConfigParams[0] = SetConfigParam({
            eid: remoteEid,
            configType: EXECUTOR_CONFIG_TYPE,
            config: abi.encode(executorConfig)
        });

        setConfigParams[1] = SetConfigParam({
            eid: remoteEid,
            configType: ULN_CONFIG_TYPE,
            config: abi.encode(ulnConfig)
        });

        vm.startBroadcast(signer);

        endpoint.setConfig(address(myOFT), sendLibraryAddress, setConfigParams);

        vm.stopBroadcast();
    }
}