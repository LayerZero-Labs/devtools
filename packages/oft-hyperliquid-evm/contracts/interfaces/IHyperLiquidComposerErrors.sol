// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ErrorMessage {
    address refundTo;
    uint256 refundAmount;
    bytes errorMessage;
}

interface IHyperLiquidComposerErrors {
    error ErrorMsg(bytes errorMessage);

    error HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength(bytes message, uint256 length);
    error HyperLiquidComposer_InvalidCall_NotEndpoint(address notEndpointAddress, address expectedEndpointAddress);
    error HyperLiquidComposer_InvalidCall_NotOFT(address internalOFTAddress, address receivedOFTAddress);
    error HyperLiquidComposer_FailedToSend_HYPE(uint256 amount);
    error HyperLiquidComposer_FailedToReturn_HYPE_Dust(address to, uint256 amount);
    error HyperLiquidComposer_InvalidCall_NotComposer(address notComposerAddress);
}
