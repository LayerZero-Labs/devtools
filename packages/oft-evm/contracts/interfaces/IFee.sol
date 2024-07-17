// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.0;

struct FeeConfig {
    uint16 feeBps;
    bool enabled;
}

interface IFee {
    error InvalidBps();
    error InvalidFeeOwner();

    event FeeBpsSet(uint32 dstEid, uint16 feeBps, bool enabled);
    event DefaultFeeBpsSet(uint16 feeBps);
}
