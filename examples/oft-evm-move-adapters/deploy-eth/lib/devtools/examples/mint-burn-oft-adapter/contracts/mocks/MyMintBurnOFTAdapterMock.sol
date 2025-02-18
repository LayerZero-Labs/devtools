// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MyMintBurnOFTAdapter } from "../MyMintBurnOFTAdapter.sol";

import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";

// @dev WARNING: This is for testing purposes only
contract MyMintBurnOFTAdapterMock is MyMintBurnOFTAdapter {
    constructor(
        address _token,
        IMintableBurnable _minterBurner,
        address _lzEndpoint,
        address _delegate
    ) MyMintBurnOFTAdapter(_token, _minterBurner, _lzEndpoint, _delegate) {}
}
