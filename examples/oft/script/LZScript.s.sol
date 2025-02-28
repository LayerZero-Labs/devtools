// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";

import { LZScripts } from "@layerzerolabs/script-devtools-evm-foundry/script/LZScripts.s.sol";

contract LZScript is Script, LZScripts {
    function run() public pure override {
        console.log("Hello, World!");
    }
}
