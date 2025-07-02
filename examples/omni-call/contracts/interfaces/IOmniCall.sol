// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  LayerZero imports    ==========

import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

//  ==========  Internal imports    ==========

import { Call, Transfer } from "../OmniCallMsgCodecLib.sol";

/// -----------------------------------------------------------------------
/// Interface
/// -----------------------------------------------------------------------

/**
 * @title IOmniCall
 * @author LayerZeroLabs (@EWCunha).
 * @notice Interface for the OmniCall contract.
 */
interface IOmniCall {
    /// -----------------------------------------------------------------------
    /// Custom errors
    /// -----------------------------------------------------------------------

    /// @dev Error for when a zero gas limit is passed as a parameter.
    error LZ_OmniCall__ZeroGasLimit();

    /// @dev Error for when a call target is the endpoint.
    error LZ_OmniCall__InvalidTarget();

    /// @dev Error for when a call has no calldata and non-zero value.
    error LZ_OmniCall__InvalidCall();

    /// -----------------------------------------------------------------------
    /// State-change public/external functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Sends a message and/or transfers gas tokens.
     * @notice UNSAFE: there is the possibility the transaction will revert on the destination chain.
     * To avoid that, be sure to provide correct `dstGasLimit`.
     * @param messageType: type of message to be sent;
     * @param dstEid: endpoint ID of the destination chain;
     * @param dstCall: destination call;
     * @param dstTransfer: destination transfer;
     * @param dstGasLimit: gas limit for destination call/transfer.
     */
    function send(
        uint8 messageType,
        uint32 dstEid,
        Call calldata dstCall,
        Transfer calldata dstTransfer,
        uint128 dstGasLimit
    ) external payable returns (MessagingReceipt memory receipt);

    /// -----------------------------------------------------------------------
    /// View public/external functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Quotes the fee of the desired cross-chain message.
     * @param messageType: type of message to be sent;
     * @param dstEid: endpoint ID of the destination chain;
     * @param dstCall: destination call;
     * @param dstTransfer: destination transfer;
     * @param dstGasLimit: gas limit for destination call/transfer.
     * @return fee - MessagingFee - struct with fee in native and lz token.
     */
    function quote(
        uint8 messageType,
        uint32 dstEid,
        Call calldata dstCall,
        Transfer calldata dstTransfer,
        uint128 dstGasLimit
    ) external view returns (MessagingFee memory fee);
}
