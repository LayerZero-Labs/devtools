// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IONFT721 } from "../../../../../contracts/onft721/interfaces/IONFT721.sol";
import { MessagingFee, MessagingReceipt } from "../../../../../contracts/onft721/ONFT721Core.sol";

struct SendParamSingle {
    uint32 dstEid; // Destination endpoint ID.
    bytes32 to; // Recipient address.
    uint256 tokenId; // token ids
    bytes extraOptions; // Additional options supplied by the caller to be used in the LayerZero message.
    bytes composeMsg; // The composed message for the send() operation.
    bytes onftCmd; // The IONFT721 command to be executed, unused in default IONFT721 implementations.
}

struct SendParamDouble {
    uint32 dstEid; // Destination endpoint ID.
    bytes32 to; // Recipient address.
    uint256 tokenId; // token ids
    uint256 tokenId2;
    bytes extraOptions; // Additional options supplied by the caller to be used in the LayerZero message.
    bytes composeMsg; // The composed message for the send() operation.
    bytes onftCmd; // The IONFT721 command to be executed, unused in default IONFT721 implementations.
}

struct SendParamTriple {
    uint32 dstEid; // Destination endpoint ID.
    bytes32 to; // Recipient address.
    uint256 tokenId; // token ids
    uint256 tokenId2;
    uint256 tokenId3;
    bytes extraOptions; // Additional options supplied by the caller to be used in the LayerZero message.
    bytes composeMsg; // The composed message for the send() operation.
    bytes onftCmd; // The IONFT721 command to be executed, unused in default IONFT721 implementations.
}

interface ITestableONFT721 is IONFT721 {
    event ONFTSent(
        bytes32 indexed guid, // GUID of the ONFT message.
        uint32 dstEid, // Destination Endpoint ID.
        address indexed fromAddress, // Address of the sender on the src chain.
        uint256 tokenId
    );

    event ONFTSent(
        bytes32 indexed guid, // GUID of the ONFT message.
        uint32 dstEid, // Destination Endpoint ID.
        address indexed fromAddress, // Address of the sender on the src chain.
        uint256 tokenId1,
        uint256 tokenId2
    );

    event ONFTSent(
        bytes32 indexed guid, // GUID of the ONFT message.
        uint32 dstEid, // Destination Endpoint ID.
        address indexed fromAddress, // Address of the sender on the src chain.
        uint256 tokenId1,
        uint256 tokenId2,
        uint256 tokenId3
    );

    function quoteSendSingle(
        SendParamSingle calldata _sendParam,
        bool payInLZToken
    ) external view returns (MessagingFee memory);

    function quoteSendDouble(
        SendParamDouble calldata _sendParam,
        bool payInLZToken
    ) external view returns (MessagingFee memory);

    function quoteSendTriple(
        SendParamTriple calldata _sendParam,
        bool payInLZToken
    ) external view returns (MessagingFee memory);

    function sendSingle(
        SendParamSingle calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory msgReceipt);

    function sendDouble(
        SendParamDouble calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory msgReceipt);

    function sendTriple(
        SendParamTriple calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory msgReceipt);

    function buildMsgAndOptions(SendParamSingle calldata _sendParam) external view returns (bytes memory, bytes memory);

    function buildMsgAndOptions(SendParamDouble calldata _sendParam) external view returns (bytes memory, bytes memory);

    function buildMsgAndOptions(SendParamTriple calldata _sendParam) external view returns (bytes memory, bytes memory);
}
