// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ErrorMessagePayload, IHyperLiquidComposerErrors } from "../interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperAssetAmount } from "../interfaces/IHyperLiquidComposer.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

/**
 * @title HyperLiquidComposerCodec
 * @author LayerZero Labs (@shankars99)
 * @notice Library for computing hyperliquid asset bridges, and converting between EVM and HyperCore amounts
 */
library HyperLiquidComposerCodec {
    /// @dev This is the largest possible token supply on HyperCore
    uint64 public constant EVM_MAX_TRANSFERABLE_INTO_CORE_PER_TX = type(uint64).max;

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
    function into_assetBridgeAddress(uint256 _coreIndexId) internal pure returns (address) {
        return address(uint160(BASE_ASSET_BRIDGE_ADDRESS_UINT256 + _coreIndexId));
    }

    /**
     * @notice Converts an asset bridge address to a core index id
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _assetBridgeAddress The asset bridge address to convert
     * @return _coreIndexId The core index id
     */
    function into_tokenId(address _assetBridgeAddress) internal pure returns (uint256) {
        return uint256(uint160(_assetBridgeAddress)) - BASE_ASSET_BRIDGE_ADDRESS_UINT256;
    }

    /**
     * @notice Converts an amount and an asset to a evm amount, core amount, and dust
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _amount The amount to convert
     * @param _assetBridgeSupply The maximum amount transferable capped by the number of tokens located on the HyperCore's side of the asset bridge
     * @param _asset The asset to convert
     * @return IHyperAssetAmount memory - The evm amount, core amount, and dust
     */
    function into_hyperAssetAmount(
        uint256 _amount,
        uint64 _assetBridgeSupply,
        IHyperAsset memory _asset
    ) internal pure returns (IHyperAssetAmount memory) {
        uint256 amountEVM;
        uint256 dust;
        uint64 amountCore;

        uint64 maxTransferableCoreAmount = min_u64(_assetBridgeSupply, EVM_MAX_TRANSFERABLE_INTO_CORE_PER_TX);

        /// @dev HyperLiquid decimal conversion: Scale EVM (u256,evmDecimals) -> Core (u64,coreDecimals)
        /// @dev Dust contains the "dust" from scaling and is used for refund.
        /// @dev Core amount is guaranteed to be within u64 range.
        if (_asset.decimalDiff > 0) {
            (amountEVM, dust, amountCore) = into_hyperAssetAmount_decimal_difference_gt_zero(
                _amount,
                maxTransferableCoreAmount,
                uint64(_asset.decimalDiff)
            );
        } else {
            (amountEVM, dust, amountCore) = into_hyperAssetAmount_decimal_difference_leq_zero(
                _amount,
                maxTransferableCoreAmount,
                uint64(-1 * _asset.decimalDiff)
            );
        }

        return IHyperAssetAmount({ evm: amountEVM, dust: dust, core: amountCore });
    }

    /**
     * @notice Computes hyperAssetAmount when EVM decimals > Core decimals
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _amount The amount to convert
     * @param _maxTransferableCoreAmount The maximum transferrable amount capped by the asset bridge has range [0,u64.max]
     * @param _decimalDiff The decimal difference between HyperEVM and HyperCore
     * @return amountEVM The EVM amount
     * @return dust The dust amount
     * @return amountCore The core amount
     */
    function into_hyperAssetAmount_decimal_difference_gt_zero(
        uint256 _amount,
        uint64 _maxTransferableCoreAmount,
        uint64 _decimalDiff
    ) internal pure returns (uint256 amountEVM, uint256 dust, uint64 amountCore) {
        uint256 scale = 10 ** _decimalDiff;
        uint256 maxEvmAmountFromCoreMax = _maxTransferableCoreAmount * scale;

        unchecked {
            /// @dev Strip out dust from _amount so that _amount and maxEvmAmountFromCoreMax have a maximum of _decimalDiff starting 0s
            uint256 amountDustless = _amount - (_amount % scale); // Safe: dustAmt = _amount % scale, so dust <= _amount

            /// @dev Safe: Bound amountEvm to the range of [0, evmscaled u64.max]
            /// @dev If amountDustless is larger then we have an overflow. Limit the tokens to u64.max and overflow into the dust
            amountEVM = min_u256(amountDustless, maxEvmAmountFromCoreMax);

            /// @dev Safe: Guaranteed to be in the range of [0, u64.max] because it is upperbounded by uint64 _maxTransferableCoreAmount
            amountCore = uint64(amountEVM / scale);
            dust = _amount - amountEVM;
        }
    }

    /**
     * @notice Computes hyperAssetAmount when EVM decimals < Core decimals and 0
     * @notice This function is called by the HyperLiquidComposer contract
     * @param _amount The amount to convert
     * @param _maxTransferableCoreAmount The maximum transferrable amount capped by the asset bridge
     * @param _decimalDiff The decimal difference between HyperEVM and HyperCore
     * @return amountEVM The EVM amount
     * @return dust The dust amount
     * @return amountCore The core amount
     */
    function into_hyperAssetAmount_decimal_difference_leq_zero(
        uint256 _amount,
        uint64 _maxTransferableCoreAmount,
        uint64 _decimalDiff
    ) internal pure returns (uint256 amountEVM, uint256 dust, uint64 amountCore) {
        uint256 scale = 10 ** _decimalDiff;
        uint256 maxEvmAmountFromCoreMax = _maxTransferableCoreAmount / scale;

        unchecked {
            /// @dev When `Core > EVM` there will be no opening dust to strip out since all tokens in evm can be represented on core
            /// @dev Safe: Bound amountEvm to the range of [0, evmscaled u64.max]
            /// @dev Overflow the excess into dust
            amountEVM = min_u256(_amount, maxEvmAmountFromCoreMax);

            /// @dev Safe: Guaranteed to be in the range of [0, u64.max] because it is upperbounded by uint64 _maxTransferableCoreAmount
            amountCore = uint64(amountEVM * scale);
            dust = _amount - amountEVM;
        }
    }

    function min_u256(uint256 a, uint256 b) internal pure returns (uint256 result) {
        /// @solidity memory-safe-assembly
        assembly {
            result := sub(a, mul(sub(a, b), lt(b, a)))
        }
    }

    function min_u64(uint64 a, uint64 b) internal pure returns (uint64 result) {
        /// @solidity memory-safe-assembly
        assembly {
            result := sub(a, mul(sub(a, b), lt(b, a)))
        }
    }
}
