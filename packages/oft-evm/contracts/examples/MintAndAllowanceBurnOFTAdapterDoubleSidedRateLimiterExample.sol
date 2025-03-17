// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter } from "../MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter.sol";
import { IMintableBurnableVoidReturn } from "../interfaces/IMintableBurnableVoidReturn.sol";

contract MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiterExample is MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}