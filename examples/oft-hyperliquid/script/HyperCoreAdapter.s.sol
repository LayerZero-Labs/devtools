// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script, console } from "forge-std/Script.sol";
import { WrappedHyperCoreAdapter as MyHyperCoreAdapter } from "../contracts/WrappedHyperCoreAdapter.sol";
import { MyHyperLiquidOFT } from "../contracts/MyHyperLiquidOFT.sol";
import { IHyperliquidWritePrecompile } from "@layerzerolabs/oft-hyperliquid-evm/contracts/interfaces/IHyperliquidWritePrecompile.sol";

contract HyperCoreAdapterScript is Script {
    address payable public constant MY_HYPERCORE_ADAPTER = payable(0xa1f743B67979554Adc87d4eb2596d2C99bD74dCC);
    address public constant MY_HYPERLIQUID_OFT = 0xAd543c6aF375b1001E3b08202b1Eb3e6e608A42F;
    address public constant OFT_TOKEN_ASSET_BRIDGE_ADDRESS = 0x20000000000000000000000000000000000004cF;
    address public constant WRITE_PRECOMPILE = 0x3333333333333333333333333333333333333333;
    MyHyperCoreAdapter public adapter;

    function exec(uint256 op) public payable {
        vm.startBroadcast();

        uint256 amount = 1e18;
        uint256 decimalDiff = 12;

        adapter = MyHyperCoreAdapter(MY_HYPERCORE_ADAPTER);
        MyHyperLiquidOFT(MY_HYPERLIQUID_OFT).mint(MY_HYPERCORE_ADAPTER, amount);
        if (op == 1) {
            adapter.sendAssetToHyperCore(msg.sender, amount);
        } else if (op == 2) {
            adapter.fundAddressOnHyperCore{ value: 0.001 ether }(msg.sender, amount);
        } else if (op == 3) {
            MyHyperLiquidOFT(MY_HYPERLIQUID_OFT).transfer(OFT_TOKEN_ASSET_BRIDGE_ADDRESS, amount);
        } else if (op == 4) {
            // need this
            MyHyperLiquidOFT(MY_HYPERLIQUID_OFT).transfer(OFT_TOKEN_ASSET_BRIDGE_ADDRESS, amount);
        } else if (op == 5) {
            IHyperliquidWritePrecompile(WRITE_PRECOMPILE).sendSpot(
                MY_HYPERCORE_ADAPTER,
                1231,
                uint64(amount / 10 ** decimalDiff)
            );
        } else {
            revert("Invalid operation");
        }

        vm.stopBroadcast();
    }
}

/*
on L1 0xAd543c6aF375b1001E3b08202b1Eb3e6e608A42F

ALICE	
8,899,999,998.999998 ALICE

USDC (Perps)
72.00 USDC

HYPE	
0.99986000 HYPE

USDC (Spot)
26.00000000 USDC

--------------------------------

on evm

ALICE (MOFT)
87000002000000000000

HYPE 
3.999
*/

// 87000002000000000000
// {"balances":[{"coin":"USDC","token":0,"total":"10.0","hold":"0.0","entryNtl":"0.0"},{"coin":"HYPE","token":1105,"total":"0.2","hold":"0.0","entryNtl":"12.7998"},{"coin":"ALICE","token":1231,"total":"989.000008","hold":"0.0","entryNtl":"0.02967"}]}
// 3998283607333349246
