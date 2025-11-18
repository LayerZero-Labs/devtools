// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAaveV3Pool } from "../../contracts/interfaces/IAaveV3Pool.sol";

contract AaveV3PoolMock is IAaveV3Pool {
    address public lastAsset;
    uint256 public lastAmount;
    address public lastOnBehalfOf;
    uint16 public lastReferralCode;
    bool public shouldRevert;
    IERC20 private immutable _token;

    constructor(address token_) {
        _token = IERC20(token_);
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external override {
        if (shouldRevert) revert();
        lastAsset = asset;
        lastAmount = amount;
        lastOnBehalfOf = onBehalfOf;
        lastReferralCode = referralCode;
        _token.transferFrom(msg.sender, address(this), amount);
    }

    function setShouldRevert(bool value) external {
        shouldRevert = value;
    }

    function tokenBalance() external view returns (uint256) {
        return _token.balanceOf(address(this));
    }
}
