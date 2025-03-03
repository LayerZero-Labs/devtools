// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IHyperLiquidERC20Extended } from "./interfaces/IHyperLiquidERC20Extended.sol";

/// @title ERC20Extension
/// @notice This contract is a wrapper around the ERC20 contract that allows for the transfer of tokens to the HyperLiquid L1 contract
/// @notice This contract is designed to be used as a replacement for the ERC20 contract such that you can simply replace the import of the ERC20 with this contract
/// @notice Hyperliquid L1 listens to token transfers to the HL_NATIVE_TRANSFER address. The token should be linked to an L1 Native Spot address before the transfer is made
abstract contract HyperLiquidERC20Extended is ERC20, Ownable, IHyperLiquidERC20Extended {
    address public constant HL_NATIVE_TRANSFER = 0x2222222222222222222222222222222222222222;
    mapping(address approvedCaller => bool) public approvedCallers;

    /// @notice Constructor for the HyperLiquidERC20Extended contract
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @dev The `owner` is by default the `msg.sender` of the constructor (the deployer of the contract)
    /// @param _name The name of the token
    /// @param _symbol The symbol of the token
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) Ownable(msg.sender) {}

    /// @notice Transfers tokens to the HyperLiquid L1 contract
    /// @dev This function is called by lzCompose()
    /// @dev This function is where tokens are credited to the receiver address
    /// @dev We can always assume that the receiver has the tokens the lzReceive() function will credit them
    function transferToHyperLiquidL1(address _receiver, uint256 _amountLD) external {
        if (!approvedCallers[msg.sender]) {
            revert ERC20Extension_NotApprovedCaller();
        }
        // Transfer the tokens that this contract received during lzReceive() back to the receiver
        _transfer(msg.sender, _receiver, _amountLD);
        // Make the transfer from the receiver to the HyperLiquid L1 contract to credit the receiver on the L1
        _transfer(_receiver, HL_NATIVE_TRANSFER, _amountLD);
        emit HyperLiquidL1Transfer(_receiver, _amountLD);
    }

    /// @notice Approves a caller to call the `transferToHyperLiquidL1` function
    /// @dev This function is called by the `owner` of the contract to approve a caller
    /// @dev The `owner` is by default the `msg.sender` of the constructor (the deployer of the contract)
    /// @param _caller The address of the caller to approve
    function approveCaller(address _caller) external onlyOwner {
        approvedCallers[_caller] = true;
        emit HyperLiquidL1CallerApproved(_caller);
    }

    /// @notice Removes a caller from the list of approved callers
    /// @dev This function is called by the `owner` of the contract to remove a caller
    /// @dev The `owner` is by default the `msg.sender` of the constructor (the deployer of the contract)
    /// @param _caller The address of the caller to remove
    function removeApprovedCaller(address _caller) external onlyOwner {
        approvedCallers[_caller] = false;
        emit HyperLiquidL1CallerRemoved(_caller);
    }

    /// @notice Returns true if the contract implements the `IHyperLiquidERC20Extended` interface
    /// @dev This function is used to check if the contract implements the `IHyperLiquidERC20Extended` interface
    /// @return true if the contract implements the `IHyperLiquidERC20Extended` interface
    function implementsExtendedFunctionality() external pure returns (bool) {
        return true;
    }
}
