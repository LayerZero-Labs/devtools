// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { IMintableBurnable } from "../../contracts/interfaces/IMintableBurnable.sol";

/**
 * @title MintBurnERC20Mock
 *
 * @dev WARNING: This contract is for testing purposes only.
 * In a production scenario, the `mint` and `burn` methods
 * should be guarded by appropriate access control mechanisms.
 */
contract MintBurnERC20Mock is ERC20, IMintableBurnable {
    /// @notice Constructor to initialize the ERC20 token with a name and symbol.
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /**
     * @notice Burns a specific amount of tokens from a given address.
     *
     * @dev WARNING: In production, this function should have access control.
     *
     * @param _from The address from which tokens will be burned.
     * @param _amount The amount of tokens to burn.
     *
     * @return A boolean indicating the success of the burn operation.
     */
    function burn(address _from, uint256 _amount) external returns (bool) {
        _burn(_from, _amount);
        return true;
    }

    /**
     * @notice Mints a specific amount of tokens to a given address.
     *
     * @dev WARNING: In production, this function should have access control.
     *
     * @param _to The address to which tokens will be minted.
     * @param _amount The amount of tokens to mint.
     *
     * @return A boolean indicating the success of the mint operation.
     */
    function mint(address _to, uint256 _amount) external returns (bool) {
        _mint(_to, _amount);
        return true;
    }
}