// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

contract Thrower {
    error CustomErrorWithNoArguments();
    error CustomErrorWithAnArgument(string message);

    function throwWithAssert() external pure {
        assert(0 == 1);
    }

    // For some reason in hardhat node this function does not revert
    function throwWithRevertAndNoArguments() external pure {
        revert();
    }

    function throwWithRevertAndArgument(string calldata message) external pure {
        revert(message);
    }

    // For some reason in hardhat node this function does not revert
    function throwWithRequireAndNoArguments() external pure {
        require(0 == 1);
    }

    function throwWithRequireAndArgument(string calldata message) external pure {
        require(0 == 1, message);
    }

    function throwWithCustomErrorAndNoArguments() external pure {
        revert CustomErrorWithNoArguments();
    }

    function throwWithCustomErrorAndArgument(string calldata message) external pure {
        revert CustomErrorWithAnArgument(message);
    }
}
