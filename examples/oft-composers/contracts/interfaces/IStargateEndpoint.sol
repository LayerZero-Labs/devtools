// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

interface IStargateEndpoint {
    function endpoint() external view returns (ILayerZeroEndpointV2);
}