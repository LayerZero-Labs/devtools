// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { Script } from "forge-std/Script.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

import { OmniCall } from "../contracts/OmniCall.sol";
import { HelperConfig } from "./HelperConfig.s.sol";

contract SetConfigs is Script {
    OmniCall public proxy = OmniCall(0x5Ba6C4855069C0745Df03636a7d47cF9fAcf8fCB);

    HelperConfig public config;

    function run() public {
        config = new HelperConfig();

        (address endpoint, , , , , uint256 key) = config.activeNetworkConfig();
        ILayerZeroEndpointV2 lzEnpoint = ILayerZeroEndpointV2(endpoint);

        vm.startBroadcast(key);

        (
            SetConfigParam[] memory sendConfigParams,
            address sendLibraryAddress,
            SetConfigParam[] memory receiveConfigParams,
            address receiveLibraryAddress
        ) = config.getConfig(address(proxy));

        lzEnpoint.setConfig(address(proxy), sendLibraryAddress, sendConfigParams);
        lzEnpoint.setConfig(address(proxy), receiveLibraryAddress, receiveConfigParams);

        vm.stopBroadcast();
    }

    function setProxyAddress(address _proxy) public {
        proxy = OmniCall(_proxy);
    }
}
