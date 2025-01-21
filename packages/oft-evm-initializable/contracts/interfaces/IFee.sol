// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.0;

struct FeeConfig {
    uint16 feeBps;
    bool enabled;
}

/**
 * @title Fee interface.
 * @notice A generic interface for collecting fees.
 */
interface IFee {
    // errors
    error InvalidBps();
    error InvalidFeeOwner();

    // events
    event FeeBpsSet(uint32 dstEid, uint16 feeBps, bool enabled);
    event DefaultFeeBpsSet(uint16 feeBps);

    // setters
    /**
     * @dev Sets the default fee basis points (BPS) for all destinations.
     */
    function setDefaultFeeBps(uint16 _feeBps) external;

    /**
     * @dev Sets the fee basis points (BPS) for a specific destination LayerZero EndpointV2 ID.
     */
    function setFeeBps(uint32 _dstEid, uint16 _feeBps, bool _enabled) external;
}
