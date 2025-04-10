// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ErrorMessagePayload, IHyperLiquidComposerErrors } from "../interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperAssetAmount } from "../interfaces/IHyperLiquidComposerCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

library HyperLiquidComposerCodec {
    /// @dev Valid compose message lengths for the HyperLiquidComposer - can be abi.encodePacked(address) or abi.encode(address)
    /// @dev If we are in abi.encodePacked(address) mode, the length is 20 bytes because addresses are 20 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;
    /// @dev If we are in abi.encode(address) mode, the length is 32 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_ENCODE = 32;

    /// @dev The base asset bridge address is the address of the HyperLiquid L1 contract
    /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
    /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    address public constant BASE_ASSET_BRIDGE_ADDRESS = 0x2000000000000000000000000000000000000000;
    uint256 public constant BASE_ASSET_BRIDGE_ADDRESS_UINT256 = uint256(uint160(BASE_ASSET_BRIDGE_ADDRESS));

    event OverflowDetected(uint256 amountCore, uint64 maxTransferableAmount);

    /// @notice Converts a core index id to an asset bridge address
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _coreIndexId The core index id to convert
    ///
    /// @return _assetBridgeAddress The asset bridge address
    function into_assetBridgeAddress(uint256 _coreIndexId) internal pure returns (address) {
        return address(uint160(BASE_ASSET_BRIDGE_ADDRESS_UINT256 + _coreIndexId));
    }

    /// @notice Converts an asset bridge address to a core index id
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _assetBridgeAddress The asset bridge address to convert
    ///
    /// @return _coreIndexId The core index id
    function into_tokenId(address _assetBridgeAddress) internal pure returns (uint256) {
        return uint256(uint160(_assetBridgeAddress)) - BASE_ASSET_BRIDGE_ADDRESS_UINT256;
    }

    /// @notice Converts an amount and an asset to a evm amount, core amount, and dust
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _amount The amount to convert
    /// @param _asset The asset to convert
    ///
    /// @return IHyperAssetAmount memory - The evm amount, core amount, and dust
    function into_hyperAssetAmount(
        uint256 _amount,
        uint64 _maxTransferableAmount,
        IHyperAsset memory _asset
    ) internal returns (IHyperAssetAmount memory) {
        uint256 amountEVM;
        uint256 dust;
        uint64 amountCore;

        if (_asset.decimalDiff > 0) {
            (amountEVM, dust, amountCore) = into_hyperAssetAmount_decimal_difference_gt_zero(
                _amount,
                _maxTransferableAmount,
                uint64(_asset.decimalDiff)
            );
        } else {
            (amountEVM, dust, amountCore) = into_hyperAssetAmount_decimal_difference_leq_zero(
                _amount,
                _maxTransferableAmount,
                uint64(-1 * _asset.decimalDiff)
            );
        }

        return IHyperAssetAmount({ evm: amountEVM, dust: dust, core: amountCore });
    }

    /// @notice Computes hyperAssetAmount when EVM decimals > Core decimals
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _amount The amount to convert
    /// @param _maxTransferableAmount The maximum transferrable amount capped by the asset bridge
    /// @param _extraWeiDecimals The decimal difference between HyperEVM and HyperCore
    ///
    /// @return amountEVM The EVM amount
    /// @return dust The dust amount
    /// @return amountCore The core amount
    function into_hyperAssetAmount_decimal_difference_gt_zero(
        uint256 _amount,
        uint64 _maxTransferableAmount,
        uint64 _extraWeiDecimals
    ) internal returns (uint256 amountEVM, uint256 dust, uint64 amountCore) {
        uint256 scale = 10 ** _extraWeiDecimals;

        /// @dev Fewer decimals on HyperCore leads to fewer decimals of precision
        /// @dev This means we can't represent decimals from [LSb-(extraWeiDecimals)]
        /// @dev Since LSb = 0, the numbers in extraWeiDecimals are dust - (% 10.pow(extraWeiDecimals))
        unchecked {
            dust = _amount % scale;
            amountEVM = _amount - dust;
        }

        uint256 amountCore256 = _amount / scale;
        amountCore = uint64(amountCore256);

        if (amountCore256 > _maxTransferableAmount) {
            emit OverflowDetected(amountCore256, _maxTransferableAmount);

            uint256 overflowEVM = (amountCore256 - _maxTransferableAmount) * scale;
            amountCore = _maxTransferableAmount;
            amountEVM = _maxTransferableAmount * scale;
            dust = dust + overflowEVM;
        }
    }

    /// @notice Computes hyperAssetAmount when EVM decimals < Core decimals and 0
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _amount The amount to convert
    /// @param _maxTransferableAmount The maximum transferrable amount capped by the asset bridge
    /// @param _extraWeiDecimals The decimal difference between HyperEVM and HyperCore
    ///
    /// @return amountEVM The EVM amount
    /// @return dust The dust amount
    /// @return amountCore The core amount
    function into_hyperAssetAmount_decimal_difference_leq_zero(
        uint256 _amount,
        uint64 _maxTransferableAmount,
        uint64 _extraWeiDecimals
    ) internal returns (uint256 amountEVM, uint256 dust, uint64 amountCore) {
        uint256 scale = 10 ** _extraWeiDecimals;

        /// @dev When Core is greater than EVM there will be no dust since all tokens in evm can be represented on cores
        dust = 0;
        amountEVM = _amount;

        uint256 amountCore256 = _amount * scale;
        amountCore = uint64(amountCore256);

        if (amountCore256 > _maxTransferableAmount) {
            emit OverflowDetected(amountCore256, _maxTransferableAmount);

            amountCore = _maxTransferableAmount;
            amountEVM = _maxTransferableAmount / scale;
            dust = _amount - amountEVM;
        }
    }

    /// @notice Converts a bytes32 to an evm address
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _senderAsBytes32 The bytes32 to convert
    ///
    /// @return _evmAddress Non zero address if the bytes32 is a valid evm address, otherwise zero address
    function into_evmAddress_or_zero(bytes32 _senderAsBytes32) internal pure returns (address) {
        uint256 senderAsUint160 = uint256(_senderAsBytes32);
        if (senderAsUint160 <= type(uint160).max) {
            return address(uint160(senderAsUint160));
        }
        return address(0);
    }

    /// @notice Converts a bytes to an evm address
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _senderAsBytes The bytes to convert
    ///
    /// @return _evmAddress Non zero address if the bytes are a valid evm address, otherwise zero address
    function into_evmAddress_or_zero(bytes memory _senderAsBytes) internal pure returns (address) {
        uint256 length = _senderAsBytes.length;
        if (length == VALID_COMPOSE_MESSAGE_LENGTH_PACKED) {
            return address(bytes20(_senderAsBytes));
        } else if (length == VALID_COMPOSE_MESSAGE_LENGTH_ENCODE) {
            bytes32 senderAsBytes32 = bytes32(_senderAsBytes);
            return into_evmAddress_or_zero(senderAsBytes32);
        }
        return address(0);
    }

    /// @notice Extracts the error payload from a bytes array
    /// @notice This function is called by the HyperLiquidComposer contract
    /// @dev Strips out the revert message to extract the payload ErrorMsg(bytes errorMessage) - ('0x' + 32 bytes) * 2 = 64 bytes
    ///
    /// @param _err The bytes array to extract the error payload from
    ///
    /// @return _errorPayload The error payload
    function extractErrorPayload(bytes calldata _err) internal pure returns (bytes memory) {
        return _err[64 + 4:];
    }

    /// @notice Creates an error message payload
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _errorMessage The error message to create
    /// @param _sender The sender of the error message
    /// @param _amountLD The amount of the error message
    ///
    /// @return _errorMessagePayload The error message payload
    function createErrorMessage(
        bytes memory _errorMessage,
        address _sender,
        uint256 _amountLD
    ) internal pure returns (bytes memory) {
        return
            abi.encode(
                ErrorMessagePayload({ refundTo: _sender, refundAmount: _amountLD, errorMessage: _errorMessage })
            );
    }
}
