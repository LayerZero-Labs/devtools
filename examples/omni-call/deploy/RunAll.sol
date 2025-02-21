// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { Script, console } from "forge-std/Script.sol";

import { OmniCall } from "../contracts/OmniCall.sol";
import { Deploy } from "./Deploy.s.sol";
import { SetConfigs } from "./SetConfigs.s.sol";
import { SetPeer } from "./SetPeer.s.sol";

contract RunAll is Script {
    bool shouldDeploy = false;
    bool shouldSetConfig = false;
    bool shouldSetPeer = false;

    OmniCall proxy = OmniCall(0x5Ba6C4855069C0745Df03636a7d47cF9fAcf8fCB);
    address public peer = 0xb3cc445698945E47d09552BdAC83D24160d0801a;
    uint32 public peerEid = 40106;

    function run() public {
        Deploy deploy = new Deploy();
        SetConfigs setConfigs = new SetConfigs();
        SetPeer setPeer = new SetPeer();

        if (shouldDeploy) {
            console.log("Deploying proxy...");
            deploy.run();
            proxy = deploy.proxy();
            console.log("Proxy deployed at:", address(proxy));
        }
        if (shouldSetConfig) {
            console.log("Setting configs...");
            setConfigs.setProxyAddress(address(proxy));
            setConfigs.run();
            console.log("Configs set");
        }
        if (shouldSetPeer) {
            console.log("Setting peer...");
            setPeer.setPeerData(address(proxy), peer, peerEid);
            setPeer.run();
            console.log("Peer set");
        }
    }
}
