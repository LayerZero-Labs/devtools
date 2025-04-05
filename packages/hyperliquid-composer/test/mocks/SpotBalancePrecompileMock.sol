// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IHyperLiquidReadPrecompile } from "../../contracts/interfaces/IHyperLiquidReadPrecompile.sol";

contract SpotBalancePrecompileMock {
    mapping(address user => mapping(uint64 tokenId => IHyperLiquidReadPrecompile.SpotBalance balance))
        private _balances;

    function setSpotBalance(address user, uint64 tokenId, uint64 balance) external {
        _balances[user][tokenId] = IHyperLiquidReadPrecompile.SpotBalance({ total: balance, hold: 0, entryNtl: 0 });
    }

    fallback(bytes calldata data) external returns (bytes memory) {
        (address user, uint64 tokenId) = abi.decode(data, (address, uint64));
        return abi.encode(_balances[user][tokenId]);
    }
}
