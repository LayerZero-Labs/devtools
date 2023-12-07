// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

contract DefaultOApp {
    mapping(uint256 => bytes32) public peers;

    function setPeer(uint256 eid, bytes32 peer) external {
        peers[eid] = peer;
    }
}
