// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperLiquidComposer.sol";

contract MyHyperLiquidComposer is HyperLiquidComposer {
    constructor(
        address _lzEndpoint,
        address _oft,
        uint64 _hlIndexId,
        uint64 _weiDiff
    ) HyperLiquidComposer(_lzEndpoint, _oft, _hlIndexId, _weiDiff) {}
}
