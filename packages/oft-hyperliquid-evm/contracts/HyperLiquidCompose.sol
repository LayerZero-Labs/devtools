// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IExecutorWithEndpoint } from "./interfaces/IExecutorWithEndpoint.sol";
import { IHyperLiquidComposer } from "./interfaces/IHyperLiquidComposer.sol";

import { HyperLiquidOFTComposeMsgCodec } from "./library/HyperLiquidOFTComposeMsgCodec.sol";

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title OFT with lzCompose() as a postHook that transfers tokens to the HyperLiquid L1 contract (0x2222222222222222222222222222222222222222)
/// @dev This contract is a wrapper around the OFT contract that allows for the composition of messages to be sent to the HyperLiquidComposer.
/// @dev This contract is meant to execute _lzCompose() as a postHook to pre-existing lzCompose() calls >= 0
/// @notice This contract is designed to be used as a replacement for the OFT contract such that you can simply replace the import of the OFT with this contract
abstract contract HyperLiquidComposer is IHyperLiquidComposer, OFT {
    using SafeERC20 for IERC20;

    address public constant HL_NATIVE_TRANSFER = 0x2222222222222222222222222222222222222222;

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) {}

    /// @notice Composes a message to be sent to the HyperLiquidComposer
    /// @param _oApp The address of the OApp that is sending the composed message.
    /// @param _message The encoded message content, expected to be of type: (address receiver).
    /// @param _executor The address of the executor that is sending the composed message.
    function lzCompose(
        address _oApp,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address _executor,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        // @dev We can't rely on the transaction coming in from the endpoint.
        // This is because the call can be through the flow:
        // endpoint -> partner lzCompose (can be at an arbitrary address) -> this lzCompose
        // Therefore, we need to check if the endpoint is the same as the one from the executor
        address endpointFromExecutor = IExecutorWithEndpoint(_executor).endpoint();
        if (endpointFromExecutor == address(0)) {
            revert HyperLiquidComposer_EndpointFromExecutorIsZeroAddress(endpointFromExecutor);
        }

        address endpointFromOApp = address(endpoint);

        if (endpointFromExecutor != endpointFromOApp) {
            revert HyperLiquidComposer_MismatchingEndpoint_Executor_OApp(endpointFromExecutor, endpointFromOApp);
        }

        // Since this lzCompose() logic lives within the OFT contract, we know that the _oApp is the address of the OFT contract
        if (_oApp == address(this)) {
            (address _receiver, uint256 _amountLD) = decodeMessage(_message);

            // Transfer the tokens to the HyperLiquid L1 contract
            _transferToL1(_receiver, _amountLD);
        } else {
            revert HyperLiquidComposer_NotCalledFromOFT(_oApp);
        }
    }

    /// @notice Transfers tokens to the HyperLiquid L1 contract
    /// @dev This function is called by lzCompose()
    /// @dev This function is where tokens are credited to the receiver address
    function _transferToL1(address _receiver, uint256 _amountLD) internal virtual {
        /// @dev An earlier lzCompose() call may have been the token minter.
        /// @dev This means that the receiver's address does not have the tokens.
        /// @dev The earlier lzCompose() should forward the tokens it minted to the receiver's address.
        if (IERC20(_receiver).balanceOf(_receiver) < _amountLD) {
            revert HyperLiquidComposer_ReceiverHasInsufficientBalance(
                IERC20(_receiver).balanceOf(_receiver),
                _amountLD
            );
        }

        _transfer(_receiver, HL_NATIVE_TRANSFER, _amountLD);
    }

    /// @notice Validates the message and returns the receiver address
    /// @dev This function is called by lzCompose()
    /// @dev This function is where we validate the encoded message and get the receiver address
    /// @return _receiver The receiver address
    /// @return _amountLD The amount of tokens to be transferred
    function decodeMessage(bytes calldata _message) public pure returns (address _receiver, uint256 _amountLD) {
        /// Try decoding the message to get the receiver address and amount
        (_receiver, _amountLD) = HyperLiquidOFTComposeMsgCodec.validateAndDecodeMessage(_message);
    }

    /// @notice Encodes a message to be sent to the HyperLiquidComposer
    /// @dev This function can be called by earlier lzCompose() calls to prepare a message to be sent to the HyperLiquidComposer
    /// @dev The encoder does not worry about `nonce` and `srcEid` because the HyperLiquidComposer's lzCompose() does not use them
    /// @return _message The encoded message
    function encodeMessage(address _receiver, uint256 _amountLD) public pure returns (bytes memory _message) {
        // Encode the message to be a valid format accepted by the lzCompose() function listed above
        _message = HyperLiquidOFTComposeMsgCodec.encodeMessage(_receiver, _amountLD);
    }
}
