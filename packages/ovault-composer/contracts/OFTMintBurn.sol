// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";

contract OFTMintBurn is OFT, IERC20MintBurnExtension {
    mapping(address => uint256) public approvedMinters;
    mapping(address => uint256) public approvedBurners;
    address public approvedSpender;

    bool public constant ERC4626AdapterCompliant = true;

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}

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
