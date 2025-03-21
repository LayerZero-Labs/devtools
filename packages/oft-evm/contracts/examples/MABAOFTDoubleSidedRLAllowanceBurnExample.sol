// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { MABAOFTDoubleSidedRLAllowanceBurn } from "../MABAOFTDoubleSidedRLAllowanceBurn.sol";

contract MABAOFTDoubleSidedRLAllowanceBurnExample is MABAOFTDoubleSidedRLAllowanceBurn {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) MABAOFTDoubleSidedRLAllowanceBurn(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}