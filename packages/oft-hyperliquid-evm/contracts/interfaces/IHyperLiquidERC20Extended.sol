// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHyperLiquidERC20Extended is IERC20 {
    error ERC20Extension_NotApprovedCaller();
    event HyperLiquidL1Transfer(address indexed _receiver, uint256 _amountLD);
    event HyperLiquidL1CallerApproved(address indexed _caller);
    event HyperLiquidL1CallerRemoved(address indexed _caller);

    function HL_NATIVE_TRANSFER() external view returns (address);
    function implementsExtendedFunctionality() external pure returns (bool);

    function transferToHyperLiquidL1(address _receiver, uint256 _amountLD) external;
    function approveCaller(address _caller) external;
    function removeApprovedCaller(address _caller) external;
}
