// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { IMintableBurnableVoidReturn } from "../../contracts/interfaces/IMintableBurnableVoidReturn.sol";

/**
 * @title MintBurnFromAllowanceERC20Mock
 *
 * @dev WARNING: This contract is for testing purposes only.
 * In a production scenario, the `mint` method
 * should be guarded by appropriate access control mechanisms.
 */
contract MintBurnFromAllowanceERC20Mock is ERC20, IMintableBurnableVoidReturn {
    error InsufficientAllowance(uint256 allowed, uint256 required);

    /// @notice Constructor to initialize the ERC20 token with a name and symbol.
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function burn(address _from, uint256 _amount) external {
        if (_from != msg.sender) {
            _spendAllowance(_from, msg.sender, _amount);
        }

        _burn(_from, _amount);
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}