// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSync } from "./VaultComposerSync.sol";

/**
 * @title VaultComposerSyncDepositOnly
 * @author LayerZero Labs (@ravinagill15)
 * @notice Cross-chain vault composer enabling omnichain vault operations via LayerZero
 * @notice This composer only supports Deposit actions. Redemption is disabled and will revert
 *
 * @dev IMPORTANT: This contract intentionally disables redemption functionality by overriding _redeem()
 *      to always revert. This causes unreachable code warnings in the parent VaultComposerSync
 *      contract's redemption paths, which is expected and correct behavior.
 */
contract VaultComposerSyncDepositOnly is VaultComposerSync {
    error RedemptionDisabled();

    /**
     * @notice Creates a new cross-chain vault composer
     * @dev Initializes the composer with vault and OFT contracts for omnichain operations
     * @param _vault The vault contract implementing ERC4626 for deposit/redeem operations
     * @param _assetOFT The OFT contract for cross-chain asset transfers
     * @param _shareOFT The OFT contract for cross-chain share transfers
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSync(_vault, _assetOFT, _shareOFT) {}

    /**
     * @notice Cross-chain redemptions are disabled for ethena's sUSDe vault
     * @dev Users should interact with the vault directly for redemption 
     * @dev Ethena vaults operate with a 2 step redemption which is not supported in synchronous vaults
     * @dev Functions that are disabled: 
            1. lzCompose(..args) to redeem 
            2. redeemAndShare(..args)
     */
    function _redeem(
        bytes32 /*_redeemer*/,
        uint256 /*_shareAmount*/
    ) internal pure override returns (uint256 /*assetAmount*/) {
        // Disable redemption to prevent cross-chain redemptions
        revert RedemptionDisabled();
    }
}
