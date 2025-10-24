// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSync } from "./VaultComposerSync.sol";

/**
 * @title VaultComposerSyncDepositOnly
 * @author LayerZero Labs (@ravinagill15)
 * @notice Cross-chain vault composer enabling omnichain vault operations via LayerZero.
 * @notice This composer only supports Deposit actions. Redemption is disabled and will revert.
 *
 * @dev IMPORTANT: This contract intentionally disables redemption functionality by overriding _redeem()
 *      to always revert. This causes unreachable code warnings in the parent VaultComposerSync
 *      contract's redemption paths, which is expected and correct behavior.
 */
contract VaultComposerSyncDepositOnly is VaultComposerSync {
    error RedemptionDisabled();

    /**
     * @notice Initializes the VaultComposerSyncDepositOnly contract with vault and OFT token addresses.
     * @param _vault The address of the ERC4626 vault contract
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _shareOFT The address of the share OFT contract (must be an adapter)
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Asset token should match the vault's underlying asset (overridable behavior)
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSync(_vault, _assetOFT, _shareOFT) {}

    /**
     * @notice Redemptions are disabled for this vault.
     * @dev Users should interact with the vault directly for redemption.
     *      When called via redeemAndSend, this will revert atomically, preventing the redemption.
     *      When called via lzCompose during cross-chain operations, the revert will trigger
     *      a refund back to the original source chain.
     */
    function _redeem(
        bytes32 /*_redeemer*/,
        uint256 /*_shareAmount*/
    ) internal pure override returns (uint256 /*assetAmount*/) {
        /// @dev Disable all redemptions
        revert RedemptionDisabled();
    }
}
