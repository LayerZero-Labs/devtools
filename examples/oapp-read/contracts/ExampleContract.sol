// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ExampleContract
 * @notice A simple contract with a public state variable.
 */
contract ExampleContract {
    // a public data variable on the target data chain to read from
    uint256 public data;

    constructor(uint256 _data) {
        data = _data;
    }
}
