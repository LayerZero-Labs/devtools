// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OVault } from "@layerzerolabs/ovault-evm/contracts/OVault.sol";
import { OVaultUpgradeable } from "@layerzerolabs/ovault-evm/contracts/OVaultUpgradeable.sol";

contract MockOVault is OVault {
    constructor(string memory name, string memory symbol, address asset) OVault(name, symbol, asset) {}

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}

contract MockOVaultUpgradeable is OVaultUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() OVaultUpgradeable() {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address _asset) internal onlyInitializing {
        __OVault_init(_name, _symbol, _asset);
    }

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}
