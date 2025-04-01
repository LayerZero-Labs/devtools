// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHyperLiquidReadPrecompile {
    struct Position {
        int64 szi;
        uint32 leverage;
        uint64 entryNtl;
    }

    struct SpotBalance {
        uint64 total;
        uint64 hold;
        uint64 entryNtl;
    }

    struct UserVaultEquity {
        uint64 equity;
    }

    struct Withdrawable {
        uint64 withdrawable;
    }

    struct Delegation {
        address validator;
        uint64 amount;
        uint64 lockedUntilTimestamp;
    }

    struct DelegatorSummary {
        uint64 delegated;
        uint64 undelegated;
        uint64 totalPendingWithdrawal;
        uint64 nPendingWithdrawals;
    }

    function position(address user, uint16 perp) external view returns (Position memory);

    function spotBalance(address user, uint64 token) external view returns (SpotBalance memory);

    function userVaultEquity(address user, address vault) external view returns (UserVaultEquity memory);

    function withdrawable(address user) external view returns (Withdrawable memory);

    function delegations(address user) external view returns (Delegation[] memory);

    function delegatorSummary(address user) external view returns (DelegatorSummary memory);

    function markPx(uint16 index) external view returns (uint64);

    function oraclePx(uint16 index) external view returns (uint64);

    function spotPx(uint32 index) external view returns (uint64);

    function l1BlockNumber() external view returns (uint64);
}
