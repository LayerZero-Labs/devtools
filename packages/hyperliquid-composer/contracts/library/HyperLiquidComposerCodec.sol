// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHyperAssetAmount } from "../interfaces/IHyperLiquidComposer.sol";

/**
 * @title HyperLiquidComposerCodec
 * @author LayerZero Labs (@shankars99)
 * @notice Library for computing hyperliquid asset bridges, and converting between EVM and HyperCore amounts
 */
library HyperLiquidComposerCodec {
    error TransferAmtExceedsAssetBridgeBalance(uint256 amt, uint256 maxAmt);

    /// @dev The base asset bridge address is the address of the HyperLiquid L1 contract
    /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
    /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    address public constant BASE_ASSET_BRIDGE_ADDRESS = 0x2000000000000000000000000000000000000000;
    uint256 public constant BASE_ASSET_BRIDGE_ADDRESS_UINT256 = uint256(uint160(BASE_ASSET_BRIDGE_ADDRESS));

    /**
     * @notice Converts a core index id to an asset bridge address
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _coreIndexId The core index id to convert
     * @return _assetBridgeAddress The asset bridge address
     */
    function into_assetBridgeAddress(uint64 _coreIndexId) internal pure returns (address) {
        return address(uint160(BASE_ASSET_BRIDGE_ADDRESS_UINT256 + _coreIndexId));
    }

    /**
     * @notice Converts an asset bridge address to a core index id
     * @param _assetBridgeAddress The asset bridge address to convert
     * @return _coreIndexId The core index id
     */
    function into_tokenId(address _assetBridgeAddress) internal pure returns (uint64) {
        return uint64(uint160(_assetBridgeAddress) - BASE_ASSET_BRIDGE_ADDRESS_UINT256);
    }

    /**
     * @notice Converts an amount and an asset to a evm amount and core amount
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _amount The amount to convert
     * @param _assetBridgeSupply The maximum amount transferable capped by the number of tokens located on the HyperCore's side of the asset bridge
     * @param _decimalDiff The decimal difference of evmDecimals - coreDecimals
     * @return IHyperAssetAmount memory - The evm amount and core amount
     */
    function into_hyperAssetAmount(
        uint256 _amount,
        uint64 _assetBridgeSupply,
        int8 _decimalDiff
    ) internal pure returns (IHyperAssetAmount memory) {
        uint256 amountEVM;
        uint64 amountCore;

        /// @dev HyperLiquid decimal conversion: Scale EVM (u256,evmDecimals) -> Core (u64,coreDecimals)
        /// @dev Core amount is guaranteed to be within u64 range.
        if (_decimalDiff > 0) {
            (amountEVM, amountCore) = into_hyperAssetAmount_decimal_difference_gt_zero(
                _amount,
                _assetBridgeSupply,
                uint8(_decimalDiff)
            );
        } else {
            (amountEVM, amountCore) = into_hyperAssetAmount_decimal_difference_leq_zero(
                _amount,
                _assetBridgeSupply,
                uint8(-1 * _decimalDiff)
            );
        }

        return IHyperAssetAmount({ evm: amountEVM, core: amountCore, coreBalanceAssetBridge: _assetBridgeSupply });
    }

    /**
     * @notice Computes hyperAssetAmount when EVM decimals > Core decimals
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _amount The amount to convert
     * @param _maxTransferableCoreAmount The maximum transferrable amount capped by the asset bridge has range [0,u64.max]
     * @param _decimalDiff The decimal difference between HyperEVM and HyperCore
     * @return amountEVM The EVM amount
     * @return amountCore The core amount
     */
    function into_hyperAssetAmount_decimal_difference_gt_zero(
        uint256 _amount,
        uint64 _maxTransferableCoreAmount,
        uint8 _decimalDiff
    ) internal pure returns (uint256 amountEVM, uint64 amountCore) {
        uint256 scale = 10 ** _decimalDiff;
        uint256 maxAmt = _maxTransferableCoreAmount * scale;

        unchecked {
            /// @dev Strip out dust from _amount so that _amount and maxEvmAmountFromCoreMax have a maximum of _decimalDiff starting 0s
            amountEVM = _amount - (_amount % scale); // Safe: dustAmt = _amount % scale, so dust <= _amount

            if (amountEVM > maxAmt) revert TransferAmtExceedsAssetBridgeBalance(amountEVM, maxAmt);

            /// @dev Safe: Guaranteed to be in the range of [0, u64.max] because it is upperbounded by uint64 maxAmt
            amountCore = uint64(amountEVM / scale);
        }
    }

    /**
     * @notice Computes hyperAssetAmount when EVM decimals < Core decimals and 0
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _amount The amount to convert
     * @param _maxTransferableCoreAmount The maximum transferrable amount capped by the asset bridge
     * @param _decimalDiff The decimal difference between HyperEVM and HyperCore
     * @return amountEVM The EVM amount
     * @return amountCore The core amount
     */
    function into_hyperAssetAmount_decimal_difference_leq_zero(
        uint256 _amount,
        uint64 _maxTransferableCoreAmount,
        uint8 _decimalDiff
    ) internal pure returns (uint256 amountEVM, uint64 amountCore) {
        uint256 scale = 10 ** _decimalDiff;
        uint256 maxAmt = _maxTransferableCoreAmount / scale;

        unchecked {
            amountEVM = _amount;

            /// @dev When `Core > EVM` there will be no opening dust to strip out since all tokens in evm can be represented on core
            /// @dev Safe: Bound amountEvm to the range of [0, evmscaled u64.max]
            if (_amount > maxAmt) revert TransferAmtExceedsAssetBridgeBalance(amountEVM, maxAmt);

            /// @dev Safe: Guaranteed to be in the range of [0, u64.max] because it is upperbounded by uint64 maxAmt
            amountCore = uint64(amountEVM * scale);
        }
    }
}
