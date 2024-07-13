// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.0;

interface IFee {
    error InvalidBps();
    error InvalidFeeOwner();

    event SetFeeBp(uint32 dstEid, bool enabled, uint16 feeBps);
    event SetDefaultFeeBp(uint16 feeBps);
    event SetFeeOwner(address feeOwner);
}
