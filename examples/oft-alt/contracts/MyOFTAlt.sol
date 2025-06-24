// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAlt } from "@layerzerolabs/oft-alt-evm/contracts/OFTAlt.sol";

contract MyOFTAlt is OFTAlt {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFTAlt(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
