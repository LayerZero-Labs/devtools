// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

library HyperLiquidOFTComposeMsgCodec {
    /// @dev The length of the message that is valid for the HyperLiquidComposer
    /// @dev This is 20 bytes because addresses are 20 bytes
    /// @dev We are in encodePacked mode, if we are in encode mode, the length is 42 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;

    error HyperLiquidComposer_Codec_InvalidMessage_HasExtraData(bytes _message, uint256 _length);

    function validateAndDecodeMessage(
        bytes calldata _composeMessage
    ) internal pure returns (address _receiver, uint256 _amountLD) {
        bytes memory message = OFTComposeMsgCodec.composeMsg(_composeMessage);

        // Addresses in EVM are 20 bytes
        // So if the message's length is not 20 bytes, we can pre-emptively revert
        if (message.length != VALID_COMPOSE_MESSAGE_LENGTH_PACKED) {
            revert HyperLiquidComposer_Codec_InvalidMessage_HasExtraData(message, message.length);
        }

        // Since we are encodePacked, we can just decode the first 20 bytes as an address
        _receiver = address(bytes20(message));
        _amountLD = OFTComposeMsgCodec.amountLD(_composeMessage);
    }
}
