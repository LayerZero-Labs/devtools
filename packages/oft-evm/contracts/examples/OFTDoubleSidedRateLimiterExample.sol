// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { OFTDoubleSidedRateLimiter } from "../OFTDoubleSidedRateLimiter.sol";

contract OFTDoubleSidedRateLimiterExample is OFTDoubleSidedRateLimiter {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFTDoubleSidedRateLimiter(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}
}