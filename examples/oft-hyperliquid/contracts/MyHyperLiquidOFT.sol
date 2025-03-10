// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidOFT } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperLiquidOFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract MyHyperLiquidOFT is HyperLiquidOFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) HyperLiquidOFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        _mint(_delegate, 100e18);
    }

    function mint(address _to, uint256 _amount) public virtual {
        _mint(_to, _amount);
    }
}
