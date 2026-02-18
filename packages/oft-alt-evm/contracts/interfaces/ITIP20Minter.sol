// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// copied from TIP20 spec: https://github.com/tempoxyz/tempo/blob/3dbee269cabffa58c6942ece1d155783924e8b5e/docs/specs/src/interfaces/ITIP20.sol
interface ITIP20Minter {
    function mint(address to, uint256 amount) external;

    function burn(uint256 amount) external;
}
