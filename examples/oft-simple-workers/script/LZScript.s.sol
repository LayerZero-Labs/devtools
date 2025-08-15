// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { console } from "forge-std/console.sol";

import { LZScripts } from "@layerzerolabs/script-devtools-evm-foundry/scripts/LZScripts.s.sol";

contract LZScript is LZScripts {
    function run() public pure override {
        console.log("Hello, World!");
    }
}
