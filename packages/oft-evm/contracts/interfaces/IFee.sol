// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.0;

struct FeeConfig {
    uint16 feeBps;
    bool enabled;
}

interface IFee {
    error InvalidBps();
    error InvalidFeeOwner();
}
