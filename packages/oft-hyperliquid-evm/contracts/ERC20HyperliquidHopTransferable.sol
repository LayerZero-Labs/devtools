// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { IERC20HyperliquidHopTransferable } from "./interfaces/IERC20HyperliquidHopTransferable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20Extension
///
/// @dev This contract is a wrapper around the ERC20 contract that allows for the transfer of tokens to the HyperLiquid L1 contract
/// @dev This contract is designed to be used as a replacement for the ERC20 contract such that you can simply replace the import of the ERC20 with this contract
/// @dev Hyperliquid L1 listens to token transfers to the HL_NATIVE_TRANSFER address. The token should be linked to an L1 Native Spot address before the transfer is made
abstract contract ERC20HyperliquidHopTransferable is ERC20, IERC20HyperliquidHopTransferable, Ownable {
    address public constant HL_NATIVE_TRANSFER = 0x2222222222222222222222222222222222222222;
    mapping(address approvedCaller => bool) public approvedCallers;

    /// @notice Constructor for the HyperLiquidERC20Extended contract
    ///
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @dev The `onlyErc20Admin` is by default the `msg.sender` of the constructor (the deployer of the contract)
    ///
    /// @param _name The name of the token
    /// @param _symbol The symbol of the token
    /// @param _delegate The delegate owner of the contract
    constructor(string memory _name, string memory _symbol, address _delegate) ERC20(_name, _symbol) {}

    /// @notice Transfers tokens to the HyperLiquid L1 contract
    ///
    /// @dev This function is called by lzCompose()
    /// @dev This function is where tokens are credited to the receiver address
    /// @dev We can always assume that the receiver has the tokens the lzReceive() function will credit them
    function hopTransferToHyperLiquidL1(address _receiver, uint256 _amountLD) external {
        if (!approvedCallers[msg.sender]) {
            revert ERC20HyperliquidHopTransferable_NotApprovedCaller();
        }
        // Transfer the tokens that this contract received during lzReceive() back to the receiver
        _transfer(msg.sender, _receiver, _amountLD);
        // Make the transfer from the receiver to the HyperLiquid L1 contract to credit the receiver on the L1
        _transfer(_receiver, HL_NATIVE_TRANSFER, _amountLD);
        emit HyperLiquidL1Transfer(_receiver, _amountLD);
    }

    /// @notice Approves a caller to call the `transferToHyperLiquidL1` function
    ///
    /// @dev This function is called by the `owner` of the contract to approve a caller
    /// @dev The `owner` is by default the `msg.sender` of the constructor (the deployer of the contract)
    ///
    /// @param _caller The address of the caller to approve
    function approveCaller(address _caller) external onlyOwner {
        approvedCallers[_caller] = true;
        emit HyperLiquidL1CallerApproved(_caller);
    }

    /// @notice Removes a caller from the list of approved callers
    ///
    /// @dev This function is called by the `owner` of the contract to remove a caller
    /// @dev The `owner` is by default the `msg.sender` of the constructor (the deployer of the contract)
    ///
    /// @param _caller The address of the caller to remove
    function removeApprovedCaller(address _caller) external onlyOwner {
        approvedCallers[_caller] = false;
        emit HyperLiquidL1CallerRemoved(_caller);
    }

    /// @notice Transfers the delegate owner role to a new address
    ///
    /// @dev This function is called by the `delegateOwner` to transfer the role to a new address
    ///
    /// @param _newDelegateOwner The address of the new delegate owner
    function transferDelegateOwner(address _newDelegateOwner) external onlyOwner {
        _transferOwnership(_newDelegateOwner);
    }

    /// @notice Returns true if the contract implements the `IHyperLiquidERC20Extended` interface
    ///
    /// @dev This function is used to check if the contract implements the `IHyperLiquidERC20Extended` interface
    ///
    /// @return true if the contract implements the `IHyperLiquidERC20Extended` interface
    function implementsHopTransferFunctionality() external pure returns (bool) {
        return true;
    }
}
