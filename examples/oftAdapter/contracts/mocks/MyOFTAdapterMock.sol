// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MyOFTAdapter } from "../MyOFTAdapter.sol";

// @dev WARNING: This is for testing purposes only
contract MyOFTAdapterMock is MyOFTAdapter {
    constructor(address _token, address _lzEndpoint, address _delegate) MyOFTAdapter(_token, _lzEndpoint, _delegate) {}
}
