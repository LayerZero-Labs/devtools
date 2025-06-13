// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { ERC20MintBurn } from "../../../contracts/ERC20MintBurn.sol";

contract MockERC20MintBurn is ERC20MintBurn {
    constructor(string memory _name, string memory _symbol) ERC20MintBurn(_name, _symbol) {}
}
