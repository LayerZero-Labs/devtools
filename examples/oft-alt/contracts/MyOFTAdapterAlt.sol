// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapterAlt } from "@layerzerolabs/oft-alt-evm/contracts/OFTAdapterAlt.sol";

contract MyOFTAdapterAlt is OFTAdapterAlt {
    constructor(
        address _address,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapterAlt(_address, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
