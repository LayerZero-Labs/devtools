// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";
import { RecoverableComposer } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/RecoverableComposer.sol";
import { PreFundedFeeAbstraction } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/PreFundedFeeAbstraction.sol";

/// @dev Composer with PreFundedFeeAbstraction extension for NonFee tokens.
///      Activation fees are charged from deposited assets using real-time spot prices.
///      Fees are collected in the base asset and can be retrieved by the recovery address.
///      Composer maintains a balance of the quote asset (FeeToken) which is used to pay for activation fees.
///
/// @dev Does NOT refund dust due to sharedDecimals truncation.
/// @dev Disclaimer: If EVM supply exceeds bridge balance, tokens return to sender on HyperEVM.
contract MyHyperLiquidComposer_FeeAbstraction is PreFundedFeeAbstraction {
    /// @param _oft The OFT address
    /// @param _hlIndexId The HyperLiquid core spot index
    /// @param _assetDecimalDiff EVM - HyperLiquid decimal difference
    /// @param _spotId The spot pair ID (e.g., 107 for HYPE/USDC)
    /// @param _activationOverheadFee Overhead fee in cents on top of $1 base
    /// @param _recoveryAddress Address for fee recovery
    constructor(
        address _oft,
        uint64 _hlIndexId,
        int8 _assetDecimalDiff,
        uint64 _spotId,
        uint16 _activationOverheadFee,
        address _recoveryAddress
    )
        HyperLiquidComposer(_oft, _hlIndexId, _assetDecimalDiff)
        RecoverableComposer(_recoveryAddress)
        PreFundedFeeAbstraction(_spotId, _activationOverheadFee)
    {}
}
