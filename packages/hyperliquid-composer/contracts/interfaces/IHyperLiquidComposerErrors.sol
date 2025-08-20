// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ErrorMessagePayload {
    address refundTo;
    uint256 refundAmount;
    bytes errorMessage;
}

interface IHyperLiquidComposerErrors {
    error InsufficientGas(uint256 gasLeft, uint256 minGas);

    error InvalidEndpoint(address receivedEndpointAddress);

    // 0x0b948634
    error FailedMessageNotFound(bytes32 guid);

    // 0x4f952033
    error ErrorMsg(bytes errorMessage);

    error NotEndpoint(address notEndpointAddress, address expectedEndpointAddress);
    error NotOFT(address internalOFTAddress, address receivedOFTAddress);
    error NotComposer(address notComposerAddress);
    error InsufficientMsgValue(uint256 msgValue, uint256 requiredValue);

    // 0x903b5a83
    error HyperLiquidComposer_ReceiverCannotBeZeroAddress(address receiver);

    // 0x00d4895a
    error HyperLiquidComposer_ComposeMsgNot64Byte(bytes composeMessage, uint256 length);

    // 0xc8ee485e
    error HyperLiquidComposer_FailedToRefund_HYPE(address to, uint256 amount);
    // 0xb7e54a07
    error HyperLiquidComposer_FailedToSend_HYPE(uint256 amount);

    // 0x09b34731
    error HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength(bytes message, uint256 length);
    // 0xa91ed721
    error HyperLiquidComposerCore_SpotBalanceRead_Failed(address user, uint64 tokenId);
}
