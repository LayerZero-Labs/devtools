// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IVaultComposerSyncPool } from "./IVaultComposerSyncPool.sol";

interface IVaultComposerSyncPoolNative is IVaultComposerSyncPool {
    error StargatePoolTokenNotNative();
}
