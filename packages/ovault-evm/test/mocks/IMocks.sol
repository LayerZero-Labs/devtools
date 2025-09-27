// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IStargatePool } from "@stargatefinance/stg-evm-v2/src/interfaces/IStargatePool.sol";
import { Path } from "@stargatefinance/stg-evm-v2/src/libs/Path.sol";

interface IStargatePoolWithPath is IStargatePool {
    function paths(uint32 eid) external view returns (Path memory);
}
