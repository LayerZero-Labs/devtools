// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { FeeConfig, IFee } from "./interfaces/IFee.sol";

abstract contract Fee is IFee, Ownable {
    event FeeBpsSet(uint32 dstEid, uint16 feeBps, bool enabled);
    event DefaultFeeBpsSet(uint16 feeBps);

    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public defaultFeeBps;
    mapping(uint32 dstEid => FeeConfig config) public feeBps;

    function setDefaultFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps >= BPS_DENOMINATOR) revert IFee.InvalidBps();
        defaultFeeBps = _feeBps;
        emit DefaultFeeBpsSet(_feeBps);
    }

    function setFeeBps(uint32 _dstEid, uint16 _feeBps, bool _enabled) external onlyOwner {
        if (_feeBps >= BPS_DENOMINATOR) revert IFee.InvalidBps();
        feeBps[_dstEid] = FeeConfig(_feeBps, _enabled);
        emit FeeBpsSet(_dstEid, _feeBps, _enabled);
    }

    function getFee(uint32 _dstEid, uint256 _amount) public view virtual returns (uint256) {
        uint16 feeBps = _getFeeBps(_dstEid);
        return feeBps == 0 ? 0 : (_amount * feeBps) / BPS_DENOMINATOR;
    }

    function _getFeeBps(uint32 _dstEid) internal view returns (uint16) {
        FeeConfig memory config = feeBps[_dstEid];
        if (config.enabled) {
            return config.feeBps;
        } else if (defaultFeeBps > 0) {
            return defaultFeeBps;
        }
        return 0;
    }
}
