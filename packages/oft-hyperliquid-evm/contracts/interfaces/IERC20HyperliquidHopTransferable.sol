// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20HyperliquidHopTransferable is IERC20 {
    error ERC20HyperliquidHopTransferable_NotApprovedCaller();

    event HyperLiquidL1Transfer(address indexed _receiver, address indexed _hlTokenBridge, uint256 _amountLD);
    event HyperLiquidL1CallerApproved(address indexed _caller);
    event HyperLiquidL1CallerRemoved(address indexed _caller);

    function hopTransferToHyperLiquidL1(address _receiver, address _hlTokenBridge, uint256 _amountLD) external;
    function approveCaller(address _caller) external;
    function removeApprovedCaller(address _caller) external;
    function implementsHopTransferFunctionality() external pure returns (bool);
}
