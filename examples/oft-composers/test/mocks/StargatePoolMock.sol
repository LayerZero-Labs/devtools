// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

contract StargatePoolMock {
    ILayerZeroEndpointV2 private immutable _endpoint;
    address private immutable _token;

    constructor(address endpoint_, address token_) {
        _endpoint = ILayerZeroEndpointV2(endpoint_);
        _token = token_;
    }

    function endpoint() external view returns (ILayerZeroEndpointV2) {
        return _endpoint;
    }

    function token() external view returns (address) {
        return _token;
    }
}
