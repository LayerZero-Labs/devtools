// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/// @title Interface for mintable and burnable tokens
interface IMintableBurnable {
    
    /**
     * @notice Burns tokens from a specified account
     * @param _from Address from which tokens will be burned
     * @param _amount Amount of tokens to be burned
     * @return success Indicates whether the operation was successful
     */
    function burn(address _from, uint256 _amount) external returns (bool success);

    /**
     * @notice Mints tokens to a specified account
     * @param _to Address to which tokens will be minted
     * @param _amount Amount of tokens to be minted
     * @return success Indicates whether the operation was successful
     */
    function mint(address _to, uint256 _amount) external returns (bool success);
}