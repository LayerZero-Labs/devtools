// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";
import { RecoverableComposer } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/RecoverableComposer.sol";
import { FeeToken } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/FeeToken.sol";
import { PreFundedFeeAbstraction } from "@layerzerolabs/hyperliquid-composer/contracts/extensions/PreFundedFeeAbstraction.sol";

/// @dev Composer with PreFundedFeeAbstraction extension for NonFee tokens.
///      Activation fees are charged from deposited assets using real-time spot prices.
///      Fees are collected in the base asset and can be retrieved by the recovery address.
///      Composer maintains a balance of the quote asset (FeeToken) which is used to pay for activation fees.
///
/// @dev Does NOT refund dust due to sharedDecimals truncation.
/// @dev Disclaimer: If EVM supply exceeds bridge balance, tokens return to sender on HyperEVM.
contract MyHyperLiquidComposer_FeeAbstraction is FeeToken, RecoverableComposer, PreFundedFeeAbstraction {
    error InvalidRecoveryAddress();

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
        FeeToken()
        PreFundedFeeAbstraction(_spotId, _activationOverheadFee)
    {
        if (_recoveryAddress == address(0)) revert InvalidRecoveryAddress();
    }

    /**
     * @notice Override to use PreFundedFeeAbstraction implementation for activation fee calculation
     */
    function activationFee() public view virtual override(FeeToken, PreFundedFeeAbstraction) returns (uint64) {
        return PreFundedFeeAbstraction.activationFee();
    }

    /**
     * @notice Override to use PreFundedFeeAbstraction implementation for fee calculation with user activation
     */
    function _getFinalCoreAmount(
        address _to,
        uint64 _coreAmount
    ) internal view virtual override(FeeToken, HyperLiquidComposer, PreFundedFeeAbstraction) returns (uint64) {
        return PreFundedFeeAbstraction._getFinalCoreAmount(_to, _coreAmount);
    }

    /**
     * @notice Override to use PreFundedFeeAbstraction implementation for fee tracking during transfers
     */
    function _transferERC20ToHyperCore(
        address _to,
        uint256 _amountLD
    ) internal virtual override(HyperLiquidComposer, PreFundedFeeAbstraction) {
        PreFundedFeeAbstraction._transferERC20ToHyperCore(_to, _amountLD);
    }

    /**
     * @notice Override to use PreFundedFeeAbstraction implementation for retrieving USDC
     */
    function retrieveCoreUSDC(
        uint64 _coreAmount,
        address _to
    ) public virtual override(RecoverableComposer, PreFundedFeeAbstraction) onlyRecoveryAddress {
        PreFundedFeeAbstraction.retrieveCoreUSDC(_coreAmount, _to);
    }
}
