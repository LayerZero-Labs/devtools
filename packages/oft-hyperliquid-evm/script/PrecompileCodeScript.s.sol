// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script, console } from "forge-std/Script.sol";
import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

contract PrecompileCodeScript is Script {
    uint256 public constant ALICE_CORE_INDEX_ID = 1231;
    address public constant HYPE_ASSET_BRIDGE_ADDRESS = 0x2222222222222222222222222222222222222222;
    address public assetBridgeAddress;

    function setUp() public {
        assetBridgeAddress = HyperLiquidComposerCodec.into_assetBridgeAddress(ALICE_CORE_INDEX_ID);
    }

    function run() public {
        vm.startBroadcast();

        uint256 size_hype = computeSize(HYPE_ASSET_BRIDGE_ADDRESS);
        uint256 size_myoft = computeSize(assetBridgeAddress);

        console.log("HYPE_HyperBridgeAddress ", HYPE_ASSET_BRIDGE_ADDRESS, "extcodesize:", size_hype);
        console.log("ALICE_HyperBridgeAddress", assetBridgeAddress, "extcodesize:", size_myoft);

        vm.stopBroadcast();
    }

    function computeSize(address account) public view returns (uint256) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size;
    }
}
