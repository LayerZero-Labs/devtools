// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";

contract OFTMintBurn is OFT, IERC20MintBurnExtension {
    modifier onlySuperUsers() {
        if (!superUsers[msg.sender]) {
            revert NotSuperUser(msg.sender);
        }
        _;
    }

    mapping(address => bool) public superUsers;

    bool public constant ERC4626AdapterCompliant = true;

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}

    function setSuperUser(address _superUser, bool _status) external onlyOwner {
        superUsers[_superUser] = _status;
        emit SuperUserSet(_superUser, _status);
    }

    function mint(address _to, uint256 _amount) external onlySuperUsers {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external onlySuperUsers {
        _burn(_from, _amount);
    }

    function spendAllowance(address _owner, address _spender, uint256 _amount) external onlySuperUsers {
        _spendAllowance(_owner, _spender, _amount);
    }

    function transfer(address _from, address _to, uint256 _amount) external onlySuperUsers {
        _transfer(_from, _to, _amount);
    }

    function approve(address owner, address spender, uint256 value) external onlySuperUsers {
        _approve(owner, spender, value, true);
    }
}
