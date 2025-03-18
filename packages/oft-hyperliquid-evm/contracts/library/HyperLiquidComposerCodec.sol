// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

library HyperLiquidComposerCodec {
    /// @dev The length of the message that is valid for the HyperLiquidComposer
    /// @dev This is 20 bytes because addresses are 20 bytes
    /// @dev We are in encodePacked mode, if we are in encode mode, the length is 42 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;

    /// @dev The base asset bridge address is the address of the HyperLiquid L1 contract
    /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
    /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
    /// @dev It is formed by 0x2000...0000 + the core index id
    address public constant BASE_ASSET_BRIDGE_ADDRESS = 0x2000000000000000000000000000000000000000;
    uint256 public constant BASE_ASSET_BRIDGE_ADDRESS_UINT256 = uint256(uint160(BASE_ASSET_BRIDGE_ADDRESS));

    error HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength(bytes message, uint256 length);

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

    function into_assetBridgeAddress(uint256 _coreIndexId) internal pure returns (address) {
        return address(uint160(BASE_ASSET_BRIDGE_ADDRESS_UINT256 + _coreIndexId));
    }

    function into_tokenId(address _assetBridgeAddress) internal pure returns (uint256) {
        return uint256(uint160(_assetBridgeAddress)) - BASE_ASSET_BRIDGE_ADDRESS_UINT256;
    }
}

/*
0x000000000000000000000000acc732e49f38002af5f29e9f042494e5352073500000000000000001000000000000000000000000a3824bffc05178b1ed611117e5b900adcb189b94000000000000000000009ca6000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000acc732e49f38002af5f29e9f042494e535207350acc732e49f38002af5f29e9f042494e535207350

0x09b34731000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000060000000000000000000009ca6000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000acc732e49f38002af5f29e9f042494e535207350acc732e49f38002af5f29e9f042494e535207350





*/