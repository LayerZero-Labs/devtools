// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20MintBurnExtension } from "./interfaces/IERC20MintBurnExtension.sol";
import { ERC4626Adapter } from "./ERC4626Adapter.sol";
import { IOVault } from "./interfaces/IOVault.sol";

contract OVault is ERC4626Adapter, IOVault {
    address public immutable ASSET_OFT;
    address public immutable SHARE_OFT;

    constructor(IOFT _asset, IOFT _share) ERC4626Adapter(_asset.token(), _share.token()) {
        if (!IERC20MintBurnExtension(_share.token()).ERC4626AdapterCompliant()) {
            revert ShareNotERC4626AdapterCompliant();
        }

        ASSET_OFT = address(_asset);
        SHARE_OFT = address(_share);
    }
}
