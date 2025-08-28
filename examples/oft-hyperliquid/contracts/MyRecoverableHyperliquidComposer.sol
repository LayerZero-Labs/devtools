// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";
import { RecoverableComposer } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/RecoverableComposer.sol";

contract HyperLiquidComposer_Recoverable is HyperLiquidComposer, RecoverableComposer {
    /// @notice Constructor for the HyperLiquidComposer
    ///
    /// @param _oft The address of the OFT
    /// @param _hlIndexId The HyperLiquid core spot's index value
    /// @param _assetDecimalDiff The difference in decimals between the HyperEVM's ERC20 and the HyperLiquid HIP-1 token
    ///                 (i.e. 18 decimals on evm and 6 on HyperLiquid would be 18 - 6 = 12)
    /// @param _recoveryAddress The address to which funds can be recovered

    constructor(
        address _oft,
        uint64 _hlIndexId,
        int64 _assetDecimalDiff,
        address _recoveryAddress
    ) HyperLiquidComposer(_oft, _hlIndexId, _assetDecimalDiff) RecoverableComposer(_recoveryAddress) {}
}
