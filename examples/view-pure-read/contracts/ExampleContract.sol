// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ExampleContract
 * @notice A contract with a pure function for mathematical operations.
 */
contract ExampleContract {
    /**
     * @notice Adds two numbers.
     * @param a First number.
     * @param b Second number.
     * @return sum The sum of a and b.
     */
    function add(uint256 a, uint256 b) external pure returns (uint256 sum) {
        return a + b;
    }
}
