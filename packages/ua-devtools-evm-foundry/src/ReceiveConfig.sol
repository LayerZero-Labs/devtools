// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// Forge imports
import "forge-std/console.sol";
import "forge-std/Script.sol";

// LayerZero imports
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";

contract ReceiveConfig is Script {
    uint32 public constant RECEIVE_CONFIG_TYPE = 2;

    function run(address contractAddress, uint32 remoteEid, address receiveLibraryAddress, address signer, UlnConfig calldata ulnConfig) external {
        OFT myOFT = OFT(contractAddress);

        ILayerZeroEndpointV2 endpoint = ILayerZeroEndpointV2(address(myOFT.endpoint()));
        
        SetConfigParam[] memory setConfigParams = new SetConfigParam[](1);
        setConfigParams[0] = SetConfigParam({
            eid: remoteEid,
            configType: RECEIVE_CONFIG_TYPE,
            config: abi.encode(ulnConfig)
        });

        vm.startBroadcast(signer);

        endpoint.setConfig(address(myOFT), receiveLibraryAddress, setConfigParams);

        vm.stopBroadcast();
    }
}
