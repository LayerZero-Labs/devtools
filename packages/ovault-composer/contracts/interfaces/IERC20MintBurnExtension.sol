// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20MintBurnExtension {
    event SuperUserSet(address superUser, bool status);

    error NotSuperUser(address sender);

    function superUsers(address superUser) external view returns (bool);

    function setSuperUser(address superUser, bool status) external;

    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function spendAllowance(address owner, address spender, uint256 amount) external;
    function transfer(address from, address to, uint256 amount) external;
    function approve(address owner, address spender, uint256 value) external;

    function ERC4626AdapterCompliant() external view returns (bool);
}
