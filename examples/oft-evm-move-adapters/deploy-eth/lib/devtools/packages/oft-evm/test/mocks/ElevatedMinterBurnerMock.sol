// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IMintableBurnable } from "../../contracts/interfaces/IMintableBurnable.sol";

/// @title Operatable
/// @notice Enables granular access control by designating operators
contract Operatable is Ownable {
    /// @notice Triggered when an operator is added or removed
    event OperatorChanged(address indexed operator, bool status);

    /// @notice Error to indicate unauthorized access by non-operators
    error NotAllowedOperator();

    /// @dev Mapping of addresses to their operator status
    mapping(address => bool) public operators;

    /// @notice Initializes the contract by setting the deployer as an operator
    /// @param _owner Address that will own the contract
    constructor(address _owner) Ownable(_owner) {
        operators[msg.sender] = true;
    }

    /// @notice Ensures function is called by an operator
    modifier onlyOperators() {
        if (!operators[msg.sender]) {
            revert NotAllowedOperator();
        }
        _;
    }

    /**
     * @notice Allows the owner to set or unset operator status of an address
     * @param operator The address to be modified
     * @param status Boolean indicating whether the address should be an operator
     */
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
        emit OperatorChanged(operator, status);
    }
}

/// @title ElevatedMinterBurnerMock
/// @notice Manages minting and burning of tokens through delegated control to operators
contract ElevatedMinterBurnerMock is IMintableBurnable, Operatable {
    /// @notice Reference to the token with mint and burn capabilities
    IMintableBurnable public immutable token;

    /**
     * @notice Initializes the contract by linking a token and setting the owner
     * @param token_ The mintable and burnable token interface address
     * @param _owner The owner of this contract, who can set operators
     */
    constructor(IMintableBurnable token_, address _owner) Operatable(_owner) {
        token = token_;
    }

    function burn(address from, uint256 amount) external override onlyOperators returns (bool) {
        return token.burn(from, amount);
    }

    function mint(address to, uint256 amount) external override onlyOperators returns (bool) {
        return token.mint(to, amount);
    }
}