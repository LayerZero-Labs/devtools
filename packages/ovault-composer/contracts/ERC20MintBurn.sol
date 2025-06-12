// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20MintBurn is IERC20MintBurnExtension, ERC20, Ownable {
    mapping(address => uint256) public approvedMinters;
    mapping(address => uint256) public approvedBurners;
    address public approvedSpender;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) Ownable(msg.sender) {}

    function setMinter(address _minter, uint256 _amount) external onlyOwner {
        approvedMinters[_minter] = _amount;
        emit MinterSet(_minter, _amount);
    }

    function setBurner(address _burner, uint256 _amount) external onlyOwner {
        approvedBurners[_burner] = _amount;
        emit BurnerSet(_burner, _amount);
    }

    function setSpender(address _spender) external onlyOwner {
        approvedSpender = _spender;
        emit SpenderSet(_spender);
    }

    function mint(address _to, uint256 _amount) external {
        require(approvedMinters[msg.sender] >= _amount, "ERC20MintBurn: minter not approved");
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external {
        require(approvedBurners[msg.sender] >= _amount, "ERC20MintBurn: burner not approved");
        _burn(_from, _amount);
    }

    function spendAllowance(address _owner, address _spender, uint256 _amount) external {
        require(msg.sender == approvedSpender, "ERC20MintBurn: spender not approved");
        _spendAllowance(_owner, _spender, _amount);
    }
}
