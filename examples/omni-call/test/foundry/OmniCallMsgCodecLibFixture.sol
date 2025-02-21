// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  Internal imports    ==========

import { OmniCallMsgCodecLib } from "../../contracts/OmniCallMsgCodecLib.sol";
import { MessageType, Call, Transfer } from "../../contracts/OmniCall.sol";

/// -----------------------------------------------------------------------
/// Fixture
/// -----------------------------------------------------------------------

/**
 * @title OmniCallMsgCodecLib fixture.
 * @author LayerZeroLabs (@EWCunha).
 */
contract OmniCallMsgCodecLibFixture {
    function encode(
        MessageType messageType,
        Call calldata dstCall,
        Transfer calldata dstTransfer
    ) external pure returns (bytes memory) {
        return OmniCallMsgCodecLib.encode(messageType, dstCall, dstTransfer);
    }

    function decode(
        bytes calldata data
    ) external pure returns (address to, uint128 transferValue, address target, uint128 value, bytes memory callData) {
        return OmniCallMsgCodecLib.decode(data);
    }

    function isCallType(bytes calldata data) external pure returns (bool) {
        return OmniCallMsgCodecLib.isCallType(data);
    }

    function isCallAndTransferType(bytes calldata data) external pure returns (bool) {
        return OmniCallMsgCodecLib.isCallAndTransferType(data);
    }
}
