// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Emitter } from "./Emitter.sol";

contract ChildEmitter is Emitter {
    event ChildSpecificEvent();

    function emitNoArgEvent() external override {
        emit NoArgEvent();
    }

    function emitChildSpecificEvent() external {
        emit ChildSpecificEvent();
    }
}
