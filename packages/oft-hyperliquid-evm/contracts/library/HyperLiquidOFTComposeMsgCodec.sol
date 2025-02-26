// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

library HyperLiquidOFTComposeMsgCodec {
    /// @dev The length of the message that is valid for the HyperLiquidComposer
    /// @dev This is 64 bytes because addresses are 20 bytes and the abi.encode() of an address is 64 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH = 64;

    error HyperLiquidComposer_Codec_InvalidMessage_HasExtraData(bytes _message);

    function encodeMessage(address _receiver, uint256 _amountLD) internal pure returns (bytes memory _message) {
        _message = OFTComposeMsgCodec.encode(0, 0, _amountLD, abi.encode(_receiver));
    }

    function validateAndDecodeMessage(
        bytes calldata _message
    ) internal pure returns (address _receiver, uint256 _amountLD) {
        // Addresses in EVM are 20 bytes, which makes the abi.encode() pack 0s until it's 32 bytes
        // 32 bytes is represented as 64 bytes (1 byte = 2 characters)
        // So if the message's length is not 64 bytes, we can pre-emptively revert
        if (_message.length != VALID_COMPOSE_MESSAGE_LENGTH) {
            revert HyperLiquidComposer_Codec_InvalidMessage_HasExtraData(_message);
        }

        _receiver = abi.decode(_message, (address));
        _amountLD = OFTComposeMsgCodec.amountLD(_message);
    }
}
