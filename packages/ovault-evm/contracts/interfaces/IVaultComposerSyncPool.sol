// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IVaultComposerSyncPool {
    error RemoteNotStargatePool();
    error NativeTransferFailed(uint256 amount);

    function UNLIMITED_CREDIT() external view returns (uint64);
    function DEFAULT_RECOVERY_ADDRESS() external view returns (address);
}
