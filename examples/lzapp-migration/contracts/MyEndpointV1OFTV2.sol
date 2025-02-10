// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { OFTV2 } from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";

contract MyEndpointV1OFTV2 is OFTV2 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _sharedDecimals,
        address _lzEndpoint,
        address _owner
    ) OFTV2(_name, _symbol, _sharedDecimals, _lzEndpoint) {}
}
