// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { NativeOFTAdapter } from "../../contracts/NativeOFTAdapter.sol";

contract NativeOFTAdapterMock is NativeOFTAdapter {
    constructor(
        uint8 _localDecimals,
        address _lzEndpoint,
        address _delegate
    ) NativeOFTAdapter(_localDecimals, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
