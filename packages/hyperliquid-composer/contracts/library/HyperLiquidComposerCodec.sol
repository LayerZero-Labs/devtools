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

    event OverflowDetected(uint64 amountCore, uint64 maxTransferableAmount);

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
        uint256 scale = 10 ** _asset.decimalDiff;
        uint256 dust;
        uint256 amountEVM;

        unchecked {
            dust = _amount % scale;
            amountEVM = _amount - dust;
        }

        /// @dev _amount / scale is guaranteed to be smaller than 2 ** 64
        uint64 amountCore = uint64(_amount / scale);

        if (amountCore > _maxTransferableAmount) {
            emit OverflowDetected(amountCore, _maxTransferableAmount);

            uint256 overflowEVM = (amountCore - _maxTransferableAmount) * scale;
            amountCore = _maxTransferableAmount;
            amountEVM = amountEVM - overflowEVM;
            dust = dust + overflowEVM;
        }

        return IHyperAssetAmount({ evm: amountEVM, dust: dust, core: amountCore });
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
    function extractErrorPayload(bytes calldata _err) external pure returns (bytes memory) {
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
