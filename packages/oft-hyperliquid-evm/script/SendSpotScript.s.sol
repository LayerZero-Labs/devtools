// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script } from "forge-std/Script.sol";
import { IHyperliquidWritePrecompile } from "../contracts/interfaces/IHyperliquidWritePrecompile.sol";

contract SendSpotScript is Script {
    uint256 public constant USDC_CORE_INDEX_ID = 1231;
    address public constant L1WritePrecompile = 0x3333333333333333333333333333333333333333;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        IHyperliquidWritePrecompile(L1WritePrecompile).sendSpot(msg.sender, uint64(USDC_CORE_INDEX_ID), 1e6);

        vm.stopBroadcast();
    }
}
