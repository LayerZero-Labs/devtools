// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IStargate } from "@stargatefinance/stg-evm-v2/src/interfaces/IStargate.sol";
import { Path } from "@stargatefinance/stg-evm-v2/src/libs/Path.sol";

interface IVaultComposerSyncHydra {
    error OFTSendFailed();
    error NativeTransferFailed(uint256 amount);

    function UNLIMITED_CREDIT() external view returns (uint64);
}

interface IStargateWithPath is IStargate {
    function paths(uint32 eid) external view returns (Path memory);
}
