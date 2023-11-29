// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract DefaultOApp {
    mapping(uint256 => address) public peers;

    function setPeer(uint256 eid, address peer) external {
        peers[eid] = peer;
    }
}
