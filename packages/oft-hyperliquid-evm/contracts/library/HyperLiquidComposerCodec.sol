// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHyperLiquidComposer } from "../interfaces/IHyperLiquidComposer.sol";
import { IHyperLiquidComposerErrors, ErrorMessage } from "../interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperAsset, IHyperAssetAmount } from "../interfaces/IHyperLiquidComposerCore.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
library HyperLiquidComposerCodec {
    /// @dev The base asset bridge address is the address of the HyperLiquid L1 contract
    /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
    /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    address public constant BASE_ASSET_BRIDGE_ADDRESS = 0x2000000000000000000000000000000000000000;
    uint256 public constant BASE_ASSET_BRIDGE_ADDRESS_UINT256 = uint256(uint160(BASE_ASSET_BRIDGE_ADDRESS));

    /// @dev The length of the message that is valid for the HyperLiquidComposer
    /// @dev This is 20 bytes because addresses are 20 bytes
    /// @dev We are in encodePacked mode, if we are in encode mode, the length is 32 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_ENCODE = 32;

    event OverflowDetected(uint64 amountCore, uint64 maxTransferableAmount);

    /// @notice Validates the compose message and decodes it into an address and amount
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _composeMessage The compose message to validate and decode
    ///
    /// @return _receiver The address of the receiver
    /// @return _amountLD The amount of tokens to send
    function validateAndDecodeMessage(
        bytes calldata _composeMessage
    ) public pure returns (address _receiver, uint256 _amountLD) {
        bytes memory message = OFTComposeMsgCodec.composeMsg(_composeMessage);

        _amountLD = OFTComposeMsgCodec.amountLD(_composeMessage);

        // Addresses in EVM are 20 bytes when packed or 32 bytes when encoded
        // So if the message's length is not 20 bytes, we can pre-emptively revert
        if (
            message.length != VALID_COMPOSE_MESSAGE_LENGTH_PACKED &&
            message.length != VALID_COMPOSE_MESSAGE_LENGTH_ENCODE
        ) {
            bytes memory errMsg = abi.encodeWithSelector(
                IHyperLiquidComposerErrors.HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength.selector,
                message,
                message.length
            );
            /// @dev Handling the case when the transaction is from 1 bytes-20 address and we can prevent the funds from being stuck in the composer
            /// @dev We can optimisitcally assume that the bytes20 address is an evm-address
            /// @dev If this is a non-evm address (i.e. a bytes32 on aptos move, or solana) then this abi.decode will revert and the following revert will not be thrown
            address sender = abi.decode(bytes.concat(OFTComposeMsgCodec.composeFrom(_composeMessage)), (address));
            /// @dev THrow the following error message ONLY if the sender is bytes20. It causes lzCompose to refund the sender and then emit the error message
            revert IHyperLiquidComposerErrors.ErrorMsg(
                HyperLiquidComposerCodec.createErrorMessage(sender, _amountLD, errMsg)
            );
        }

        // Since we are encodePacked, we can just decode the first 20 bytes as an address
        if (message.length == VALID_COMPOSE_MESSAGE_LENGTH_PACKED) {
            _receiver = address(bytes20(message));
        } else {
            _receiver = abi.decode(message, (address));
        }
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
    /// @return IHyperAssetAmount memory - The evm amount, core amount, and dust
    function into_hyper_asset_amount(
        uint256 _amount,
        uint64 _maxTransferableAmount,
        IHyperAsset memory _asset
    ) internal returns (IHyperAssetAmount memory) {
        uint256 scale = 10 ** _asset.decimalDiff;

        uint256 dust = _amount % scale;
        uint256 amountEVM = _amount - dust;

        // _amount / scale is guaranteed to be smaller than 2 ** 64
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

    function createErrorMessage(
        address _sender,
        uint256 _amountLD,
        bytes memory _errorMessage
    ) internal pure returns (bytes memory) {
        return abi.encode(ErrorMessage({ refundTo: _sender, refundAmount: _amountLD, errorMessage: _errorMessage }));
    }
}
