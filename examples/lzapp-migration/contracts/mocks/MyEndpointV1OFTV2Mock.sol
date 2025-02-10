// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { OFTV2 } from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";

// @dev mock OFTV2 demonstrating how to inherit OFTV2
contract MyEndpointV1OFTV2Mock is OFTV2 {
    constructor(
        address _layerZeroEndpoint,
        uint256 _initialSupply,
        uint8 _sharedDecimals
    ) OFTV2("ExampleOFT", "OFT", _sharedDecimals, _layerZeroEndpoint) {
        _mint(_msgSender(), _initialSupply);
    }
}
