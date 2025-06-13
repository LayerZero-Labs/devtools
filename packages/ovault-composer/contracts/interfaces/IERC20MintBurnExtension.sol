// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20MintBurnExtension {
    event MinterSet(address minter, uint256 amount);
    event BurnerSet(address burner, uint256 amount);
    event SpenderSet(address spender);

    error CanNotMintAmount(address minter, uint256 amount);
    error CanNotBurnAmount(address burner, uint256 amount);
    error CanNotSpend(address spender);

    function approvedMinters(address minter) external view returns (uint256);
    function approvedBurners(address burner) external view returns (uint256);
    function approvedSpender() external view returns (address);

    function setMinter(address minter, uint256 amount) external;
    function setBurner(address burner, uint256 amount) external;
    function setSpender(address spender) external;

    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function spendAllowance(address owner, address spender, uint256 amount) external;

    function ERC4626AdapterCompliant() external view returns (bool);
}
