// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter } from "../../contracts/MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter.sol";
import { IMintableBurnableVoidReturn } from "../../contracts/interfaces/IMintableBurnableVoidReturn.sol";

contract MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiterMock is MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}