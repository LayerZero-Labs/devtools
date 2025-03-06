// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperLiquidComposer.sol";

contract MyOFTComposer is HyperLiquidComposer {
    constructor(address _lzEndpoint, address _oft) HyperLiquidComposer(_lzEndpoint, _oft) {}
}
