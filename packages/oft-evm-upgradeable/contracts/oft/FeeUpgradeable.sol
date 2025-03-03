// SPDX-LICENSE-IDENTIFIER: UNLICENSED
pragma solidity ^0.8.20;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import { FeeConfig, IFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IFee.sol";

/**
 * @title FeeUpgradeable
 * @notice Implements fee configuration and calculation.
 */
abstract contract FeeUpgradeable is IFee, Initializable, OwnableUpgradeable {
    uint16 public constant BPS_DENOMINATOR = 10_000;

    struct FeeStorage {
        uint16 defaultFeeBps;
        mapping(uint32 => FeeConfig) feeBps;
    }

    // keccak256(abi.encode(uint256(keccak256("layerzerov2.storage.fee")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant FEE_STORAGE_LOCATION = 0x0cb173d183337e25fab6cb85705c15aad6a58cb1d552ed71b9bc628c8a3de800;

    /**
     * @dev The init function is intentionally left empty and does not initialize Ownable.
     * This is to ensure that Ownable can be initialized in the child contract to accommodate
     * potential different versions of Ownable that might be used.
     */
    function __Fee_init() internal onlyInitializing {}

    function __Fee_init_unchained() internal onlyInitializing {}

    function _getFeeStorage() internal pure returns (FeeStorage storage $) {
        assembly {
            $.slot := FEE_STORAGE_LOCATION
        }
    }

    /**
     * @dev Sets the default fee basis points (BPS) for all destinations.
     */
    function setDefaultFeeBps(uint16 _feeBps) external onlyOwner {
        if (_feeBps > BPS_DENOMINATOR) revert IFee.InvalidBps();
        FeeStorage storage $ = _getFeeStorage();
        $.defaultFeeBps = _feeBps;
        emit DefaultFeeBpsSet(_feeBps);
    }

    /**
     * @dev Sets the fee basis points (BPS) for a specific destination LayerZero EndpointV2 ID.
     */
    function setFeeBps(uint32 _dstEid, uint16 _feeBps, bool _enabled) external onlyOwner {
        if (_feeBps > BPS_DENOMINATOR) revert IFee.InvalidBps();
        FeeStorage storage $ = _getFeeStorage();
        $.feeBps[_dstEid] = FeeConfig(_feeBps, _enabled);
        emit FeeBpsSet(_dstEid, _feeBps, _enabled);
    }

    /**
     * @dev Returns the fee for a specific destination LayerZero EndpointV2 ID.
     */
    function getFee(uint32 _dstEid, uint256 _amount) public view virtual returns (uint256) {
        uint16 bps = _getFeeBps(_dstEid);
        //  @note If amount * bps < BPS_DENOMINATOR, there is no fee
        return bps == 0 ? 0 : (_amount * bps) / BPS_DENOMINATOR;
    }

    function _getFeeBps(uint32 _dstEid) internal view returns (uint16) {
        FeeStorage storage $ = _getFeeStorage();
        FeeConfig memory config = $.feeBps[_dstEid];
        return config.enabled ? config.feeBps : $.defaultFeeBps;
    }

    /**
     * @dev Returns the default fee.
     */
    function defaultFeeBps() public view virtual returns (uint16) {
        FeeStorage storage $ = _getFeeStorage();
        return $.defaultFeeBps;
    }

    /**
     * @dev Returns the configured fee for a given eid.
     */
    function feeBps(uint32 _dstEid) public view virtual returns (FeeConfig memory) {
        FeeStorage storage $ = _getFeeStorage();
        FeeConfig memory config = $.feeBps[_dstEid];
        return config;
    }
}