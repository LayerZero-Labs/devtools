// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OVault } from "../../../contracts/OVault.sol";

contract MockOVault is OVault {
    constructor(IOFT _asset, IOFT _share) OVault(_asset, _share) {}

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
}
