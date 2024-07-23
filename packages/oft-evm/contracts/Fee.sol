// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { FeeConfig, IFee } from "./interfaces/IFee.sol";

/**
 * @title Fee
 * @notice Implements fee configuration and calculation.
 */
abstract contract Fee is IFee, Ownable {
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /**
     * @dev Default fee basis points (BPS) for all destinations.
     */
    uint16 public defaultFeeBps;

    /**
     * @dev Fee configuration for a specific destination LayerZero endpoint ID.
     */
    mapping(uint32 dstEid => FeeConfig config) public feeBps;

    /**
     * @dev Sets the default fee basis points (BPS) for all destinations.
     */
    function setDefaultFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps > BPS_DENOMINATOR) revert IFee.InvalidBps();
        defaultFeeBps = _feeBps;
        emit DefaultFeeBpsSet(_feeBps);
    }

    /**
     * @dev Sets the fee basis points (BPS) for a specific destination LayerZero EndpointV2 ID.
     */
    function setFeeBps(uint32 _dstEid, uint16 _feeBps, bool _enabled) external onlyOwner {
        if (_feeBps > BPS_DENOMINATOR) revert IFee.InvalidBps();
        feeBps[_dstEid] = FeeConfig(_feeBps, _enabled);
        emit FeeBpsSet(_dstEid, _feeBps, _enabled);
    }

    /**
     * @dev Returns the fee for a specific destination LayerZero EndpointV2 ID.
     */
    function getFee(uint32 _dstEid, uint256 _amount) public view virtual returns (uint256) {
        uint16 bps = _getFeeBps(_dstEid);
        return bps == 0 ? 0 : (_amount * bps) / BPS_DENOMINATOR;
    }

    function _getFeeBps(uint32 _dstEid) internal view returns (uint16) {
        FeeConfig memory config = feeBps[_dstEid];
        return config.enabled ? config.feeBps : defaultFeeBps;
    }
}
