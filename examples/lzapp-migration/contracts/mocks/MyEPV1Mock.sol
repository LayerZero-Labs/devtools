// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { OFTV2 } from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";

/// @title MyEndpointV1OFTV2Mock
/// @notice **This contract is an EndpointV1 OFT implementation** and should not be used for new OFT deployments.
/// @dev The name `OFTV2`refers to the V2 implementation of the OFT on **LayerZero EndpointV1** and **not** **LayerZero EndpointV2**.
///      The `solidity-examples` repo is exclusively for EndpointV1 OFT
contract MyEndpointV1OFTV2Mock is OFTV2 {
    constructor(
        address _layerZeroEndpoint,
        uint256 _initialSupply,
        uint8 _sharedDecimals
    ) OFTV2("ExampleOFT", "OFT", _sharedDecimals, _layerZeroEndpoint) {
        _mint(_msgSender(), _initialSupply);
    }
}
