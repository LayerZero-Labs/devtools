// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script, console } from "forge-std/Script.sol";
import { IHyperliquidWritePrecompile } from "../contracts/interfaces/IHyperliquidWritePrecompile.sol";
import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

contract SendSpotScript is Script {
    uint256 public constant ALICE_CORE_INDEX_ID = 1231;
    address public constant L1WritePrecompile = 0x3333333333333333333333333333333333333333;

    function run() public {
        vm.startBroadcast();

        address alice = HyperLiquidComposerCodec.into_assetBridgeAddress(ALICE_CORE_INDEX_ID);

        IHyperliquidWritePrecompile(L1WritePrecompile).sendSpot(alice, uint64(ALICE_CORE_INDEX_ID), 1e6);

        vm.stopBroadcast();
    }
}
