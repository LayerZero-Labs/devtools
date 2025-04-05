// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";

contract MyHyperLiquidComposer is HyperLiquidComposer {
    /// @notice Constructor for the HyperLiquidComposer
    ///
    /// @dev This constructor is used to initialize the HyperLiquidComposer
    ///
    /// @param _lzEndpoint The address of the LayerZero endpoint
    /// @param _oft The address of the OFT
    /// @param _hlIndexId The HyperLiquid core spot's index value
    /// @param _weiDiff The difference in decimals between the HyperEVM's ERC20 and the HyperLiquid HIP-1 token
    ///                 (i.e. 18 decimals on evm and 6 on HyperLiquid would be 18 - 6 = 12)
    constructor(
        address _lzEndpoint,
        address _oft,
        uint64 _hlIndexId,
        uint64 _weiDiff
    ) HyperLiquidComposer(_lzEndpoint, _oft, _hlIndexId, _weiDiff) {}
}
