// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

contract Thrower {
    error CustomErrorWithNoArguments();
    error CustomErrorWithAnArgument(string message);

    // This error is duplicated in the NestedThrower
    error CommonErrorWithNoArguments();

    // This error is duplicated in the NestedThrower but with a different argument
    error CommonErrorWithAnArgument(string message);

    NestedThrower private nested;

    constructor() {
        nested = new NestedThrower();
    }

    function throwWithCustomErrorAndNoArguments() external pure {
        revert CustomErrorWithNoArguments();
    }

    function throwWithCustomErrorAndArgument(string calldata message) external pure {
        revert CustomErrorWithAnArgument(message);
    }

    function throwWithCommonErrorAndNoArguments() external pure {
        revert CommonErrorWithNoArguments();
    }

    function throwWithCommonErrorAndArgument(string calldata message) external pure {
        revert CommonErrorWithAnArgument(message);
    }

    function throwNestedWithCustomErrorAndNoArguments() external view {
        nested.throwWithCustomErrorAndNoArguments();
    }

    function throwNestedWithCustomErrorAndArgument(string calldata message) external view {
        nested.throwWithCustomErrorAndArgument(message);
    }

    function throwNestedWithCommonErrorAndNoArguments() external view {
        nested.throwWithCommonErrorAndNoArguments();
    }

    function throwNestedWithCommonErrorAndArgument(uint256 code) external view {
        nested.throwWithCommonErrorAndArgument(code);
    }
}

contract NestedThrower {
    error NestedCustomErrorWithNoArguments();
    error NestedCustomErrorWithAnArgument(string message);

    error CommonErrorWithNoArguments();
    error CommonErrorWithAnArgument(uint256 code);

    function throwWithCustomErrorAndNoArguments() external pure {
        revert NestedCustomErrorWithNoArguments();
    }

    function throwWithCustomErrorAndArgument(string calldata message) external pure {
        revert NestedCustomErrorWithAnArgument(message);
    }

    function throwWithCommonErrorAndNoArguments() external pure {
        revert CommonErrorWithNoArguments();
    }

    function throwWithCommonErrorAndArgument(uint256 code) external pure {
        revert CommonErrorWithAnArgument(code);
    }
}
