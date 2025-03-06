// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Script, console } from "forge-std/Script.sol";
import { MyHyperLiquidOFT } from "../contracts/MyHyperLiquidOFT.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        MyHyperLiquidOFT oft = new MyHyperLiquidOFT(
            "MyHyperLiquidOFT",
            "MOFT",
            0xf9e1815F151024bDE4B7C10BAC10e8Ba9F6b53E1,
            msg.sender
        );

        console.log("Deployed MyHyperLiquidOFT at ", address(oft));
        vm.stopBroadcast();
    }
}
