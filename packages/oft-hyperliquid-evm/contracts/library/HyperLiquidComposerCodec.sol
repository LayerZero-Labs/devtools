// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { HyperAsset, HyperAssetAmount } from "../interfaces/IHyperLiquidComposer.sol";

library HyperLiquidComposerCodec {
    /// @dev The length of the message that is valid for the HyperLiquidComposer
    /// @dev This is 20 bytes because addresses are 20 bytes
    /// @dev We are in encodePacked mode, if we are in encode mode, the length is 42 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;

    /// @dev The base asset bridge address is the address of the HyperLiquid L1 contract
    /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
    /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    address public constant BASE_ASSET_BRIDGE_ADDRESS = 0x2000000000000000000000000000000000000000;
    uint256 public constant BASE_ASSET_BRIDGE_ADDRESS_UINT256 = uint256(uint160(BASE_ASSET_BRIDGE_ADDRESS));

    error HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength(bytes message, uint256 length);
    error HyperLiquidComposer_Exceed_TransferLimit(uint256 allowedAmount, uint256 amountSent);

    /// @notice Validates the compose message and decodes it into an address and amount
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _composeMessage The compose message to validate and decode
    ///
    /// @return _receiver The address of the receiver
    /// @return _amountLD The amount of tokens to send
    function validateAndDecodeMessage(
        bytes calldata _composeMessage
    ) internal pure returns (address _receiver, uint256 _amountLD) {
        bytes memory message = OFTComposeMsgCodec.composeMsg(_composeMessage);

        // Addresses in EVM are 20 bytes
        // So if the message's length is not 20 bytes, we can pre-emptively revert
        if (message.length != VALID_COMPOSE_MESSAGE_LENGTH_PACKED) {
            revert HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength(message, message.length);
        }

        // Since we are encodePacked, we can just decode the first 20 bytes as an address
        _receiver = address(bytes20(message));
        _amountLD = OFTComposeMsgCodec.amountLD(_composeMessage);
    }

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
    /// @return HyperAssetAmount memory - The evm amount, core amount, and dust
    function into_core_amount_and_dust(
        uint256 _amount,
        HyperAsset memory _asset
    ) internal pure returns (HyperAssetAmount memory) {
        uint256 scale = 10 ** _asset.decimalDiff;

        /// @dev SpotSend takes in an amount of size uint64
        /// @dev This amount is in the core asset's decimals
        /// @dev Since the layerzero message can be in the size of uint256, we need to check if the amount is greater than the max size of uint64
        if (_amount > (2 ** 64) * scale) {
            revert HyperLiquidComposer_Exceed_TransferLimit((2 ** 64) * scale, _amount);
        }

        uint256 dust = _amount % scale;
        uint256 amountEVM = _amount - dust;

        // This is guaranteed to be smaller than 2 ** 64
        uint64 amountCore = uint64(_amount / scale);

        return HyperAssetAmount({ evm: amountEVM, dust: dust, core: amountCore });
    }
}
