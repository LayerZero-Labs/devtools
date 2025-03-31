// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ErrorMessagePayload {
    address refundTo;
    uint256 refundAmount;
    bytes errorMessage;
}

interface IHyperLiquidComposerErrors {
    error ErrorMsg(bytes errorMessage);

    error HyperLiquidComposer_InvalidCall_NotEndpoint(address notEndpointAddress, address expectedEndpointAddress);
    error HyperLiquidComposer_InvalidCall_NotOFT(address internalOFTAddress, address receivedOFTAddress);
    error HyperLiquidComposer_InvalidCall_NotComposer(address notComposerAddress);

    error HyperLiquidComposer_InvalidComposeMessage(bytes errorMessage);

    error HyperLiquidComposer_FailedToRefund_HYPE(address to, uint256 amount);
    error HyperLiquidComposer_FailedToSend_HYPE(uint256 amount);

    error HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength(bytes message, uint256 length);

    error HyperLiquidComposerCore_SpotBalanceRead_Failed(address user, uint64 tokenId);
}
