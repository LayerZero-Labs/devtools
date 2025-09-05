// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { SpotBalance } from "../../contracts/HyperLiquidCore.sol";

contract CoreUserExistsMock {
    mapping(address user => bool isActive) private _exists;

    function setUserExists(address user, bool exists) external {
        _exists[user] = exists;
    }

    fallback(bytes calldata data) external returns (bytes memory) {
        address user = abi.decode(data, (address));
        return abi.encode(_exists[user]);
    }
}
