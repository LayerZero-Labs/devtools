// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOVault {
    error ShareNotERC4626AdapterCompliant();

    function ASSET_OFT() external view returns (address);
    function SHARE_OFT() external view returns (address);
}
