// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSyncNative } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSyncNative.sol";

/**
 * @title MyOVaultComposerNative
 * @notice Cross-chain vault composer enabling omnichain vault operations via LayerZero
 */
contract MyOVaultComposerNative is VaultComposerSyncNative {
    /**
     * @notice Creates a new cross-chain vault composer where the vault asset is the chain's native asset
     * @dev Initializes the composer with vault and OFT contracts for omnichain operations
     * @param _vault The vault contract implementing ERC4626 for deposit/redeem operations
     * @param _assetOFT The OFT contract for cross-chain asset transfers of the chain's native asset
     * @param _shareOFT The OFT contract for cross-chain share transfers
     */
    constructor(address _vault, address _assetOFT, address _shareOFT) VaultComposerSyncNative(_vault, _assetOFT, _shareOFT) {}
}
