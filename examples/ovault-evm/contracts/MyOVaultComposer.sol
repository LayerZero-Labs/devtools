// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSync } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";

/**
 * @title MyOVaultComposer
 * @notice Cross-chain vault composer enabling omnichain vault operations via LayerZero
 */
contract MyOVaultComposer is VaultComposerSync {
    /**
     * @notice Creates a new cross-chain vault composer
     * @dev Initializes the composer with vault and OFT contracts for omnichain operations
     * @param _ovault The vault contract implementing ERC4626 for deposit/redeem operations
     * @param _assetOFT The OFT contract for cross-chain asset transfers  
     * @param _shareOFT The OFT contract for cross-chain share transfers
     */
    constructor(
        address _ovault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSync(_ovault, _assetOFT, _shareOFT) {}
}
