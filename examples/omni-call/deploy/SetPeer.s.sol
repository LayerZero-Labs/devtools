// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { Script } from "forge-std/Script.sol";

import { OmniCall } from "../contracts/OmniCall.sol";
import { HelperConfig } from "./HelperConfig.s.sol";

contract SetPeer is Script {
    OmniCall proxy = OmniCall(0x5Ba6C4855069C0745Df03636a7d47cF9fAcf8fCB);

    address public peer = 0xb3cc445698945E47d09552BdAC83D24160d0801a;
    uint32 public peerEid = 40106;

    HelperConfig public config;

    function run() public {
        config = new HelperConfig();

        (, , , , , uint256 key) = config.activeNetworkConfig();

        vm.startBroadcast(key);

        proxy.setPeer(peerEid, bytes32(uint256(uint160(peer))));

        vm.stopBroadcast();
    }

    function setPeerData(address _proxy, address _peer, uint32 _peerEid) public {
        proxy = OmniCall(_proxy);
        peer = _peer;
        peerEid = _peerEid;
    }
}
