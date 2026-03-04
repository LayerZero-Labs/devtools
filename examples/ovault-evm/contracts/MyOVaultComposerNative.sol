// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSyncNative } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSyncNative.sol";

/**
 * @title MyOVaultComposerNative
 * @notice Cross-chain vault composer enabling omnichain vault operations via LayerZero for native token assets
 *
 * @dev This composer uses the WETH9 interface (deposit/withdraw) to convert between native tokens and
 *      wrapped native tokens. This works with standard implementations like ETH->WETH and HYPE->WHYPE.
 *
 * @dev IMPORTANT: OFT.token() != Vault.asset() in this scenario:
 *      - The asset OFT returns address(0) for native tokens
 *      - The vault asset is the wrapped native token (e.g., WETH)
 *      - The composer handles the wrapping/unwrapping automatically
 *
 * @dev If your chain's wrapped native token does NOT follow the WETH9 interface, you must override
 *      the lzCompose function to use the correct wrapping mechanism.
 *
 * @dev The parent contract provides overridable functions for custom token initialization:
 *      - _initializeAssetToken(): Override for non-standard asset token patterns
 *      - _initializeShareToken(): Override for non-standard share token patterns
 */
contract MyOVaultComposerNative is VaultComposerSyncNative {
    /**
     * @notice Creates a new cross-chain vault composer where the vault asset is the chain's native asset
     * @dev Initializes the composer with vault and OFT contracts for omnichain operations
     * @dev Requires the asset OFT to be a NativeOFTAdapter or StargatePoolNative contract (OFT.token() returns address(0))
     * @dev Requires the vault's underlying asset to be a WETH9-compatible wrapped native token
     * @param _vault The vault contract implementing ERC4626 for deposit/redeem operations (asset must be WETH)
     * @param _assetOFT The NativeOFTAdapter or StargatePoolNative contract for cross-chain native asset transfers
     * @param _shareOFT The OFT contract for cross-chain share transfers
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSyncNative(_vault, _assetOFT, _shareOFT) {}
}
