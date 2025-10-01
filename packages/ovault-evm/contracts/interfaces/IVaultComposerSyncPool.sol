// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IVaultComposerSyncPool {
    error NativeTransferFailed(uint256 amount); // 0x3462af49

    function UNLIMITED_CREDIT() external view returns (uint64);
    function DEFAULT_RECOVERY_ADDRESS() external view returns (address);
}
