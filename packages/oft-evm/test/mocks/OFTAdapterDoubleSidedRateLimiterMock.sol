// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapterDoubleSidedRateLimiter } from "../../contracts/OFTAdapterDoubleSidedRateLimiter.sol";

contract OFTAdapterDoubleSidedRateLimiterMock is OFTAdapterDoubleSidedRateLimiter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapterDoubleSidedRateLimiter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}