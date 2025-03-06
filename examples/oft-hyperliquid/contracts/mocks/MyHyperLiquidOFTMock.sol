// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MyHyperLiquidOFT } from "../MyHyperLiquidOFT.sol";

// @dev WARNING: This is for testing purposes only
contract MyHyperLiquidOFTMock is MyHyperLiquidOFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) MyHyperLiquidOFT(_name, _symbol, _lzEndpoint, _delegate) {}

    function mint(address _to, uint256 _amount) public override {
        _mint(_to, _amount);
    }
}
