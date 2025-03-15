// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

/**
 * Similar to IMintableBurnable, but returns void when calling burn and mint.
 */
interface IMintableBurnableVoidReturn {
    function burn(address _from, uint256 _amount) external;

    function mint(address _to, uint256 _amount) external;
}