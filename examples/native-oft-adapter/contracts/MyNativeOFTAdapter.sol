// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { NativeOFTAdapter } from "@layerzerolabs/oft-evm/contracts/NativeOFTAdapter.sol";

/**
 * @title NativeOFTAdapter
 * @dev NativeOFTAdapter is a contract that adapts native currency to the OFT functionality.
 *
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT and needs to be done very carefully.
 * @dev WARNING: The default NativeOFTAdapter implementation assumes LOSSLESS transfers, ie. 1 native in, 1 native out.
 */
contract MyNativeOFTAdapter is NativeOFTAdapter {
    constructor(
        uint8 _localDecimals,
        address _lzEndpoint,
        address _delegate
    ) NativeOFTAdapter(_localDecimals, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
