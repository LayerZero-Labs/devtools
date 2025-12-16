// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSync } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";

/**
 * @title MyOVaultComposer
 * @notice Cross-chain vault composer enabling omnichain vault operations via LayerZero
 */
contract MyOVaultComposerERC20 is VaultComposerSync {
    /**
     * @notice Creates a new cross-chain vault composer where the vault asset is an ERC20 token
     * @dev Initializes the composer with vault and OFT contracts for omnichain operations
     * @param _vault The vault contract implementing ERC4626 for deposit/redeem operations
     * @param _assetOFT The OFT contract for cross-chain asset transfers of the vault asset
     * @param _shareOFT The OFT contract for cross-chain share transfers
     */
    constructor(address _vault, address _assetOFT, address _shareOFT) VaultComposerSync(_vault, _assetOFT, _shareOFT) {}
}
