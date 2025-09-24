// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IMockUSDC is IERC20 {
    function mint(address to, uint256 value) external returns (bool);
    function burn(address from, uint256 value) external returns (bool);
    function configureMinter(address minter, uint256 minterAllowedAmount) external returns (bool);
}

contract MockERC20 is ERC20 {
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}
