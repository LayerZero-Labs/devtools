// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { SimulateScript } from "./SimulateReceive/utils.sol";
import { GasProfilingScript } from "./GasProfiling/utils.sol";

abstract contract LZScripts is SimulateScript, GasProfilingScript {
    function IS_WORKING() public pure returns (bool) {
        return true;
    }
}
