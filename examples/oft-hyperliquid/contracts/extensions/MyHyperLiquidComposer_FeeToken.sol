// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";
import { FeeToken } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/FeeToken.sol";

/// @dev This Extension is for OFTs like USDT0 that can be used to pay activation fee for users on hypercore.
///
/// @dev This contract does NOT refund dust because we do not expect any due to truncation of sharedDecimals.
///      In the off-chance that you have dust you would have to implement dust refunds to the receiver in:
///      `_transferERC20ToHyperCore` and `_transferNativeToHyperCore`
///
/// @dev Disclaimer: If your token's evm total supply exceeds your asset bridge's balance when scaled to EVM,
///      it is possible that the composer will not be able to send the tokens to the receiver on hypercore.
///      Tokens would instead be returned to the sender address on HyperEVM. Front-end handling is recommended.
contract MyHyperLiquidComposer_FeeToken is FeeToken {
    /// @notice Constructor for the HyperLiquidComposer with FeeToken extension
    ///
    ///
    /// @param _oft The address of the OFT
    /// @param _hlIndexId The HyperLiquid core spot's index value
    /// @param _assetDecimalDiff The difference in decimals between the HyperEVM's ERC20 and the HyperLiquid HIP-1 token
    ///                 (i.e. 18 decimals on evm and 6 on HyperLiquid would be 18 - 6 = 12)

    constructor(
        address _oft,
        uint64 _hlIndexId,
        int8 _assetDecimalDiff
    ) HyperLiquidComposer(_oft, _hlIndexId, _assetDecimalDiff) {}
}
