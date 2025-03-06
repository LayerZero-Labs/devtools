// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { HyperLiquidOFT } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperLiquidOFT.sol";

contract MyHyperLiquidOFT is HyperLiquidOFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) HyperLiquidOFT(_name, _symbol, _lzEndpoint, _delegate) {
        _mint(msg.sender, 100e18);
    }

    function mint(address _to, uint256 _amount) public virtual {
        _mint(_to, _amount);
    }
}
