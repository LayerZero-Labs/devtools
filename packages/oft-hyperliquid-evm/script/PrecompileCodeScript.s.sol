// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script, console } from "forge-std/Script.sol";
import { HyperLiquidComposerCodec } from "../contracts/library/HyperLiquidComposerCodec.sol";

contract PrecompileCodeScript is Script {
    uint256 public constant USDC_CORE_INDEX_ID = 1231;
    address public constant USDC_ASSET_BRIDGE_ADDRESS = 0x2222222222222222222222222222222222222222;
    address public assetBridgeAddress;

    function setUp() public {
        assetBridgeAddress = HyperLiquidComposerCodec.into_assetBridgeAddress(USDC_CORE_INDEX_ID);
    }

    function run() public {
        vm.startBroadcast();

        uint256 size_usdc = computeSize(USDC_ASSET_BRIDGE_ADDRESS);
        uint256 size_myoft = computeSize(assetBridgeAddress);

        console.log("USDC_HyperBridgeAddress ", USDC_ASSET_BRIDGE_ADDRESS, "extcodesize:", size_usdc);
        console.log("MyOFT_HyperBridgeAddress", assetBridgeAddress, "extcodesize:", size_myoft);

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
