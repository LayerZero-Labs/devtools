// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  Internal imports    ==========

import { OmniCall, MessagingFee, MessagingReceipt, Origin, Call, Transfer, OptionsBuilder } from "../../contracts/OmniCall.sol";
import { OmniCallMsgCodecLib } from "../../contracts/OmniCallMsgCodecLib.sol";

/// -----------------------------------------------------------------------
/// Fixture
/// -----------------------------------------------------------------------

/**
 * @title OmniCall test fixture.
 * @author LayerZeroLabs (@EWCunha).
 * @notice Useful for testing internal functions.
 */
contract OmniCallFixture is OmniCall {
    using OptionsBuilder for bytes;

    constructor(address endpoint_, address delegate) OmniCall(endpoint_, delegate) {}

    function lzReceiveInternal(
        Origin calldata _origin,
        bytes32 guid,
        bytes calldata payload,
        address _executor,
        bytes calldata _extraData
    ) external {
        _lzReceive(_origin, guid, payload, _executor, _extraData);
    }

    function callInternal(address target, uint256 value, bytes memory callData) external {
        _call(target, value, callData);
    }

    function quoteWithOptionsInternal(
        uint8 messageType,
        uint32 dstEid,
        Call calldata dstCall,
        Transfer calldata dstTransfer,
        uint128 dstGasLimit
    ) external view returns (MessagingFee memory fee, bytes memory options) {
        return _quoteWithOptions(messageType, dstEid, dstCall, dstTransfer, dstGasLimit);
    }

    function encode(
        uint8 messageType,
        Call calldata dstCall,
        Transfer calldata dstTransfer
    ) external pure returns (bytes memory) {
        return OmniCallMsgCodecLib.encode(messageType, dstCall, dstTransfer);
    }

    function sendAlternative(uint32 dstEid, bytes memory encodedPayload) external {
        _lzSend(
            dstEid,
            encodedPayload,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(60_0000, 0),
            MessagingFee(0, 0),
            payable(msg.sender)
        );
    }
}
