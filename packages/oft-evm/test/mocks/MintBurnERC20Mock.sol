// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { IMintableBurnable } from "../../contracts/interfaces/IMintableBurnable.sol";

// @dev WARNING: This is for testing purposes only
contract MintBurnERC20Mock is ERC20, IMintableBurnable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function burn(address _from, uint256 _amount) external returns (bool) {
        _burn(_from, _amount);
        return true;
    }

    function mint(address _to, uint256 _amount) external returns (bool) {
        _mint(_to, _amount);
        return true;
    }
}