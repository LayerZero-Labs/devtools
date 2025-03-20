// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { MABA_RL_OFT_AllowanceBurn } from "../MABA_RL_OFT_AllowanceBurn.sol";

contract MABA_RL_OFT_AllowanceBurnExample is MABA_RL_OFT_AllowanceBurn {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) MABA_RL_OFT_AllowanceBurn(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}