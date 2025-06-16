// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20MintBurn is IERC20MintBurnExtension, ERC20, Ownable {
    modifier onlySuperUsers() {
        if (!superUsers[msg.sender]) {
            revert NotSuperUser(msg.sender);
        }
        _;
    }

    mapping(address => bool) public superUsers;

    bool public constant ERC4626AdapterCompliant = true;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) Ownable(msg.sender) {}

    function setSuperUser(address _superUser, bool _status) external onlyOwner {
        superUsers[_superUser] = _status;
        emit SuperUserSet(_superUser, _status);
    }

    function mint(address _to, uint256 _amount) external virtual onlySuperUsers {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external virtual onlySuperUsers {
        _burn(_from, _amount);
    }

    function transfer(address _from, address _to, uint256 _amount) external onlySuperUsers {
        _transfer(_from, _to, _amount);
    }

    function spendAllowance(address _owner, address _spender, uint256 _amount) external onlySuperUsers {
        _spendAllowance(_owner, _spender, _amount);
    }

    function approve(address owner, address spender, uint256 value) external onlySuperUsers {
        _approve(owner, spender, value, true);
    }
}
