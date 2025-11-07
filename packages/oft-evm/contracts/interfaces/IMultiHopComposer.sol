// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

import { IOFT, SendParam, MessagingFee } from "./IOFT.sol";

struct FailedMessage {
    address oft;
    SendParam sendParam;
    address refundOFT;
    SendParam refundSendParam;
    uint256 msgValue;
}

interface IMultiHopComposer is IOAppComposer {
    /// ========================== EVENTS =====================================
    event DecodeFailed(bytes32 indexed guid, address indexed oft, bytes message); // 0xbc772e67
    event Sent(bytes32 indexed guid, address indexed oft); // 0x69431217
    event SendFailed(bytes32 indexed guid, address indexed oft); // 0xf541998e
    event Refunded(bytes32 indexed guid, address indexed oft); // 0x5e9f0820
    event Retried(bytes32 indexed guid, address indexed oft); // 0x89aa520f

    /// ========================== Error Messages =====================================
    error InvalidAdapterMesh(); // 0xe8824245
    error InvalidOFTMesh(); // 0xabdca3b4

    error OnlyEndpoint(address caller); // 0x91ac5e4f
    error OnlySelf(address caller); // 0xa19dbf00
    error OnlyOFT(address oft); // 0x012518af
    error InvalidSendParam(SendParam sendParam); // 0x449deda1

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function ADAPTER_MESH() external view returns (address);
    function OFT_MESH() external view returns (address);
    function ENDPOINT() external view returns (address);
    function EXECUTOR() external view returns (address);

    /// ========================== FUNCTIONS =====================================
    function refund(bytes32 guid) external payable; // 0x7249fbb6
    function retry(bytes32 guid) external payable; // 0x8871e021
    function send(address _oft, SendParam memory _sendParam) external payable; // 0x5c59a0ae

    receive() external payable;
}
