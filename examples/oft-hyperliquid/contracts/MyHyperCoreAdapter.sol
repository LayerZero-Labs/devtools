// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperCoreAdapter } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperCoreAdapter.sol";

contract MyHyperCoreAdapter is HyperCoreAdapter {
    constructor(
        address _lzEndpoint,
        address _oft,
        uint64 _hlIndexId,
        uint256 _weiDiff
    ) HyperCoreAdapter(_lzEndpoint, _oft, _hlIndexId, _weiDiff) {}

    function sendAssetToHyperCore(address receiever, uint256 amount) public {
        _sendAssetToHyperCore(receiever, amount);
    }

    function fundAddressOnHyperCore(address receiever, uint256 amount) public {
        _fundAddressOnHyperCore(receiever, amount);
    }
}
