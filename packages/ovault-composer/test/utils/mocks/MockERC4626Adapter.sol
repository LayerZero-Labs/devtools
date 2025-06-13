// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC4626Adapter } from "../../../contracts/ERC4626Adapter.sol";

contract MockERC4626Adapter is ERC4626Adapter {
    using SafeERC20 for IERC20;

    constructor(address _asset, address _share) ERC4626Adapter(_asset, _share) {}

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
}
