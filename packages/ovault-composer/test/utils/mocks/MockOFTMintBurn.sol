// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { OFTMintBurn } from "../../../contracts/OFTMintBurn.sol";

contract MockOFTMintBurn is OFTMintBurn {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFTMintBurn(_name, _symbol, _lzEndpoint, _delegate) {}
}
