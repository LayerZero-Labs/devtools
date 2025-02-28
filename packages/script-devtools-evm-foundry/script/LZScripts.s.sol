// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { SimulateUtils } from "./SimulateReceive/utils.sol";

abstract contract LZScripts is SimulateUtils {
    function IS_WORKING() public pure returns (bool) {
        return true;
    }
}
