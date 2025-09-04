// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";
import { RecoverableComposer } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/RecoverableComposer.sol";

/// @dev This contract is a composer that allows transfers of ERC20 and HYPE tokens to a target address on hypercore.
///      This contract adds in an ownership model where the owner can recover tokens from the composer on hypercore.
///      This is useful for tokens that are stuck on the composer on hypercore and need to be recovered.
///      The owner can also recover tokens from the composer on hyperevm to the recovery address.
///      The owner can recover native tokens (HYPE) and USDC as well.
///
/// @dev This contract does NOT refund dust to the receiver because we do not expect any due to truncation of sharedDecimals.
///      In the off-chance that you have dust you would have to implement dust refunds to the receiver in:
///      `_transferERC20ToHyperCore` and `_transferNativeToHyperCore`
///
/// @dev Disclaimer: If your token's evm total supply exceeds your asset bridge's balance when scaled to EVM, it is possible
///      that the composer will not be able to send the tokens to the receiver address on hypercore due to bridge consumption.
///      Tokens would instead be returned to the sender address on HyperEVM. Front-end handling is recommended.
contract MyHyperLiquidComposer_Recoverable is HyperLiquidComposer, RecoverableComposer {
    error InvalidRecoveryAddress();

    /// @notice Constructor for the HyperLiquidComposer with RecoverableComposer extension
    ///
    /// @param _oft The address of the OFT
    /// @param _hlIndexId The HyperLiquid core spot's index value
    /// @param _assetDecimalDiff The difference in decimals between the HyperEVM's ERC20 and the HyperLiquid HIP-1 token
    ///                 (i.e. 18 decimals on evm and 6 on HyperLiquid would be 18 - 6 = 12)
    /// @param _recoveryAddress The address to which funds can be recovered.
    constructor(
        address _oft,
        uint64 _hlIndexId,
        int8 _assetDecimalDiff,
        address _recoveryAddress
    ) HyperLiquidComposer(_oft, _hlIndexId, _assetDecimalDiff) RecoverableComposer(_recoveryAddress) {
        if (_recoveryAddress == address(0)) revert InvalidRecoveryAddress();
    }
}
