// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFee } from "./interfaces/IFee.sol";

abstract contract Fee is Ownable {
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public defaultFeeBps;
    mapping(uint32 dstEid => FeeConfig config) public feeBps;

    struct FeeConfig {
        uint16 feeBps;
        bool enabled;
    }

    function setDefaultFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps >= BPS_DENOMINATOR) revert IFee.InvalidBps();
        defaultFeeBps = _feeBps;
    }

    function setFeeBps(uint32 _dstEid, uint16 _feeBps, bool _enabled) external onlyOwner {
        if (_feeBps >= BPS_DENOMINATOR) revert IFee.InvalidBps();
        feeBps[_dstEid] = FeeConfig(_feeBps, _enabled);
    }

    function withdrawFees(address _to) external virtual onlyOwner {
        uint256 balance = _feeBalance();
        if (balance > 0) {
            _transferFrom(address(this), _to, balance);
        }
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

    function _transferFrom(address _from, address _to, uint256 _amount) internal virtual returns (uint256);

    function _feeBalance() internal virtual returns (uint256);
}
