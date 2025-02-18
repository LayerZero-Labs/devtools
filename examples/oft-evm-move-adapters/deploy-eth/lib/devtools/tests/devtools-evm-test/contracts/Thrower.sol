// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

contract Thrower {
    error CustomErrorWithNoArguments();
    error CustomErrorWithAnArgument(string message);

    function throwWithAssert() external pure {
        assert(0 == 1);
    }

    function throwWithAssertWithCode() external pure returns (uint256 impossible) {
        uint256 numerator = 5;
        uint256 denominator = 0;

        // Should panic with code 0x12 according to
        // https://docs.soliditylang.org/en/latest/control-structures.html#error-handling-assert-require-revert-and-exceptions
        impossible = numerator / denominator;
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
