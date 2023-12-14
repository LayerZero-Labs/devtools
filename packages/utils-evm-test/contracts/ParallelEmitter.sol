// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

contract ParallelEmitter {
    event NoArgEvent();

    function emitNoArgEvent() external virtual {
        emit NoArgEvent();
    }
}
