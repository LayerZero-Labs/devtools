// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { ICoreWriter } from "../interfaces/ICoreWriter.sol";

import { HyperLiquidComposerCodec } from "../library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposer } from "../HyperLiquidComposer.sol";

/**
 * @title Fee Token Extension
 * @author LayerZero Labs (@shankars99)
 * @notice Extension contract for HyperCore tokens that can be used as a Fee token - USDT0, USDC, etc.
 */
abstract contract FeeToken is HyperLiquidComposer {
    error InsufficientCoreAmountForActivation();

    uint256 public immutable CORE_SPOT_DECIMALS;

    constructor() {
        uint8 decimals = IERC20Metadata(TOKEN).decimals();
        int8 decimalDiff = int8(tokenAsset.decimalDiff);

        /// @dev decimals = 18, decimalDiff = 10 => CORE_SPOT_DECIMALS = 8
        /// @dev decimals =  6, decimalDiff = -2 => CORE_SPOT_DECIMALS = 8
        CORE_SPOT_DECIMALS = uint8(int8(decimals) - decimalDiff);
    }

    /**
     * @notice Checks if the receiver's address is activated on HyperCore
     * @dev Default behavior is to revert if the user's account is NOT activated
     * @param _to The address to check
     * @param _coreAmount The core amount to transfer
     * @return The final core amount to transfer (same as _coreAmount in default impl)
     */
    function _getFinalCoreAmount(address _to, uint64 _coreAmount) internal view override returns (uint64) {
        if (coreUserExists(_to).exists) return _coreAmount;

        uint64 fee = activationFee();
        if (_coreAmount < fee) revert InsufficientCoreAmountForActivation();
        return _coreAmount - fee;
    }

    /**
     * @notice Returns the number of core tokens consumed to activate the user's account
     * @dev This implementation is for USD based tokens. Non-USD based tokens would need to override this function.
     * @return The number of core tokens consumed to activate the user's account
     */
    function activationFee() public view virtual returns (uint64) {
        return uint64(10 ** CORE_SPOT_DECIMALS); /// @dev Return 1 complete core token for USD stable coins
    }
}
