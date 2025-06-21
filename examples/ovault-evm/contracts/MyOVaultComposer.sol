// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OVaultComposer } from "@layerzerolabs/ovault-evm/contracts/OVaultComposer.sol";

contract MyOVaultComposer is OVaultComposer {
    constructor(address _ovault, address _assetOFT, address _shareOFT) OVaultComposer(_ovault, _assetOFT, _shareOFT) {}
}
