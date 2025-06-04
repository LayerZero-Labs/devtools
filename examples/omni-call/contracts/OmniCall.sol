// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

//  ==========  LayerZero imports    ==========

import { OApp, MessagingFee, Origin, OAppReceiver } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

//  ==========  Internal imports    ==========

import { OmniCallMsgCodecLib, Call, Transfer } from "./OmniCallMsgCodecLib.sol";
import { IOmniCall } from "./interfaces/IOmniCall.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title Generic omnichain call.
 * @author LayerZeroLabs (@EWCunha).
 * @notice Generic contract that handles cross-chain communication
 * without the need to set-up security stack and messaging options.
 */
contract OmniCall is IOmniCall, OApp {
    /// -----------------------------------------------------------------------
    /// Libraries
    /// -----------------------------------------------------------------------

    using OptionsBuilder for bytes;

    /// -----------------------------------------------------------------------
    /// State variables
    /// -----------------------------------------------------------------------

    /// @dev For better readability
    uint8 internal constant ATOMIC_MESSAGE_TYPE = OmniCallMsgCodecLib.CALL_TYPE;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    /**
     * @notice Constructor logic
     * @param endpoint_: LZ endpoint address;
     * @param delegate: address to which permissions are delegated.
     */
    constructor(address endpoint_, address delegate) OApp(endpoint_, delegate) Ownable(delegate) {}

    /// -----------------------------------------------------------------------
    /// State-change public/external functions
    /// -----------------------------------------------------------------------

    /// @inheritdoc IOmniCall
    function send(
        uint8 messageType,
        uint32 dstEid,
        Call calldata dstCall,
        Transfer calldata dstTransfer,
        uint128 dstGasLimit
    ) external payable override(IOmniCall) returns (MessagingReceipt memory receipt) {
        (MessagingFee memory fee, bytes memory options) = _quoteWithOptions(
            messageType,
            dstEid,
            dstCall,
            dstTransfer,
            dstGasLimit
        );

        bytes memory encodedPayload = OmniCallMsgCodecLib.encode(messageType, dstCall, dstTransfer);
        receipt = _lzSend(dstEid, encodedPayload, options, fee, payable(msg.sender));
    }

    /// -----------------------------------------------------------------------
    /// State-change internal/private functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Internal function override to handle incoming messages from another chain.
     * @param payload The encoded message payload being received.
     *
     * @dev The following params are unused in the current implementation of the OApp.
     * @dev _origin A struct containing information about the message sender.
     * @dev _guid A unique global packet identifier for the message.
     * @dev _executor The address of the Executor responsible for processing the message.
     * @dev _extraData Arbitrary data appended by the Executor to the message.
     */
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override(OAppReceiver) {
        if (payload.length > 0) {
            (
                address to,
                uint128 transferValue,
                address target,
                uint128 value,
                bytes memory callData
            ) = OmniCallMsgCodecLib.decode(payload);

            if (target == address(endpoint) || to == address(endpoint)) {
                revert LZ_OmniCall__InvalidTarget();
            }

            if (transferValue > 0) {
                _call(to, transferValue, "");
            }

            if (callData.length > 0) {
                _call(target, value, callData);
            }
        }
    }

    /**
     * @dev Performs arbitrary calls.
     * @param target: call target address;
     * @param value: value to be sent with the call;
     * @param callData: call calldata.
     */
    function _call(address target, uint256 value, bytes memory callData) internal {
        (bool success, bytes memory result) = target.call{ value: value }(callData);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /// -----------------------------------------------------------------------
    /// View public/external functions
    /// -----------------------------------------------------------------------

    /// @inheritdoc IOmniCall
    function quote(
        uint8 messageType,
        uint32 dstEid,
        Call calldata dstCall,
        Transfer calldata dstTransfer,
        uint128 dstGasLimit
    ) external view override(IOmniCall) returns (MessagingFee memory fee) {
        (fee, ) = _quoteWithOptions(messageType, dstEid, dstCall, dstTransfer, dstGasLimit);
    }

    /// -----------------------------------------------------------------------
    /// View internal/private functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Performs the quote call.
     * @param messageType: type of message to be sent;
     * @param dstEid: endpoint ID of the destination chain;
     * @param dstCall: destination call;
     * @param dstTransfer: destination transfer;
     * @param dstGasLimit: gas limit for destination call/transfer.
     * @return fee - MessagingFee - struct with fee in native and lz token.
     * @return options - bytes - the cross-chain message options.
     */
    function _quoteWithOptions(
        uint8 messageType,
        uint32 dstEid,
        Call calldata dstCall,
        Transfer calldata dstTransfer,
        uint128 dstGasLimit
    ) internal view returns (MessagingFee memory fee, bytes memory options) {
        if (dstGasLimit == 0) {
            revert LZ_OmniCall__ZeroGasLimit();
        }
        if (dstCall.callData.length == 0 && dstCall.value > 0) {
            revert LZ_OmniCall__InvalidCall();
        }

        if (messageType == ATOMIC_MESSAGE_TYPE) {
            options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(
                dstGasLimit,
                dstTransfer.value + dstCall.value
            );
        } else {
            options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(dstGasLimit, dstCall.value);
            if (dstTransfer.value > 0) {
                options = options.addExecutorNativeDropOption(
                    dstTransfer.value,
                    bytes32(uint256(uint160(dstTransfer.to)))
                );
            }
        }

        bytes memory encodedPayload = OmniCallMsgCodecLib.encode(messageType, dstCall, dstTransfer);
        fee = _quote(dstEid, encodedPayload, options, false);
    }
}
