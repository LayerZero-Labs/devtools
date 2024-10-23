// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MyOFTAdapterUpgradeable } from "../MyOFTAdapterUpgradeable.sol";

// @dev WARNING: This is for testing purposes only
contract MyOFTAdapterUpgradeableMock is MyOFTAdapterUpgradeable {
    constructor(address _token, address _lzEndpoint) MyOFTAdapterUpgradeable(_token, _lzEndpoint) {}
}
