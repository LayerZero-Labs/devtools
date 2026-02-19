// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ITIP20Minter } from "../../contracts/interfaces/ITIP20Minter.sol";

/**
 * @title TIP20TokenMock
 * @notice ERC20 mock that implements ITIP20Minter for TIP20OFT tests.
 * @dev mint(to, amount) mints to an address; burn(amount) burns from msg.sender (caller).
 *      For testing only; production tokens should enforce access control.
 */
contract TIP20TokenMock is ERC20, ITIP20Minter {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external override {
        _mint(to, amount);
    }

    /// @dev Burns amount from msg.sender (e.g. the OFT contract after it receives tokens).
    function burn(uint256 amount) external override {
        _burn(msg.sender, amount);
    }
}
