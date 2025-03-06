// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { HyperLiquidOFT } from "../../contracts/HyperLiquidOFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract HyperLiquidOFTMock is HyperLiquidOFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) HyperLiquidOFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
