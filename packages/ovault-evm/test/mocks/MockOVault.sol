// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { ERC4626Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MockOVault is ERC4626 {
    constructor(
        string memory _name,
        string memory _symbol,
        address _asset
    ) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) {}

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

contract MockOVaultUpgradeable is ERC4626Upgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() ERC4626Upgradeable() {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address _asset) internal onlyInitializing {
        __ERC4626_init(IERC20(_asset));
        __ERC20_init(_name, _symbol);
        __Context_init();
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
