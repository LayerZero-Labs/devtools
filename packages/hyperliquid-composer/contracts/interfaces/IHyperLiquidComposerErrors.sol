// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ErrorMessagePayload {
    address refundTo;
    uint256 refundAmount;
    bytes errorMessage;
}

interface IHyperLiquidComposerErrors {
    // 0x4d6766d6
    error HyperLiquidComposer_NotEnoughGas(uint256 gasLeft, uint256 minGas);

    // 0xfb82c1f1
    error HyperLiquidComposer_InvalidArgument_EndpointShouldNotBeZeroAddress(address receivedEndpointAddress);

    // 0x0b948634
    error FailedMessageNotFound(bytes32 guid);

    // 0x4f952033
    error ErrorMsg(bytes errorMessage);

    // 0xefa9309d
    error HyperLiquidComposer_InvalidCall_NotEndpoint(address notEndpointAddress, address expectedEndpointAddress);
    // 0x86fee0c0
    error HyperLiquidComposer_InvalidCall_NotOFT(address internalOFTAddress, address receivedOFTAddress);
    // 0x5950c85e
    error HyperLiquidComposer_InvalidCall_NotComposer(address notComposerAddress);

    // 0x78770392
    error NotEnoughMsgValue(uint256 msgValue, uint256 requiredValue);

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
