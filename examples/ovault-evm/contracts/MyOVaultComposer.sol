// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { VaultComposerSync } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";

contract MyOVaultComposer is VaultComposerSync {
    constructor(
        address _ovault,
        address _assetOFT,
        address _shareOFT
    ) VaultComposerSync(_ovault, _assetOFT, _shareOFT) {}
}
