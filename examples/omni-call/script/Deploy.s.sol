// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { Script } from "forge-std/Script.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { OmniCall } from "../contracts/OmniCall.sol";
import { HelperConfig } from "./HelperConfig.s.sol";

contract Deploy is Script {
    OmniCall public proxy;

    HelperConfig public config;

    function run() public {
        config = new HelperConfig();

        (address endpoint, , , , , uint256 key) = config.activeNetworkConfig();
        address sender = vm.addr(key);
        ILayerZeroEndpointV2 lzEnpoint = ILayerZeroEndpointV2(endpoint);

        vm.startBroadcast(key);

        proxy = new OmniCall(address(lzEnpoint), sender);

        vm.stopBroadcast();
    }
}
