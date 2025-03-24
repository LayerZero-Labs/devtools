// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { MyHyperLiquidOFT } from "../../../contracts/MyHyperLiquidOFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
contract OFTMock is MyHyperLiquidOFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) MyHyperLiquidOFT(_name, _symbol, _lzEndpoint, _delegate) {}

    function mint(address _to, uint256 _amount) public virtual override {
        _mint(_to, _amount);
    }
}
