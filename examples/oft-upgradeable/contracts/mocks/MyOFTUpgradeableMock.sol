// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MyOFTUpgradeable } from "../MyOFTUpgradeable.sol";

// @dev WARNING: This is for testing purposes only
contract MyOFTUpgradeableMock is MyOFTUpgradeable {
    constructor(address _lzEndpoint) MyOFTUpgradeable(_lzEndpoint) {}

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}
