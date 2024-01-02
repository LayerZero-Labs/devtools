// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

contract Emitter {
    event NoArgEvent();
    event OneArgEvent(uint256 arg1);
    event FourArgEvent(uint256 indexed arg1, uint128 arg2, uint64 arg3, address indexed arg4);

    function emitNoArgEvent() external virtual {
        emit NoArgEvent();
    }

    function emitOneArgEvent(uint256 arg1) external {
        emit OneArgEvent(arg1);
    }

    function emitMultiArgEvent(uint256 arg1, uint128 arg2, uint64 arg3, address arg4) external {
        emit FourArgEvent(arg1, arg2, arg3, arg4);
    }

    function emitMany(uint256 iterations) external {
        require(iterations <= 10, "Too many iterations");
        for (uint256 i = 0; i < iterations; i++) {
            this.emitNoArgEvent();
            this.emitOneArgEvent(i);
            this.emitMultiArgEvent(i, uint128(i), uint64(i), address(this));
        }
    }
}
