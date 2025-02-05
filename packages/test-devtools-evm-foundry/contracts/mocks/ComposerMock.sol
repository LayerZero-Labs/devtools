// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

/// @title ComposerMock Contract
/// @dev This contract mocks an ERC20 token swap in response to an OFT being received (lzReceive) on the destination chain to this address.
/// @notice THIS IS AN EXAMPLE CONTRACT. DO NOT USE THIS CODE IN PRODUCTION.
/// @notice The contract is designed to interact with LayerZero's Omnichain Fungible Token (OFT) Standard,
/// allowing it to respond to cross-chain OFT mint events with a token swap (erc20.safeTransfer()) action.
contract ComposerMock is IOAppComposer {
    using SafeERC20 for IERC20;
    IERC20 public erc20;
    address public immutable endpoint;
    address public immutable oApp;

    /// @notice Emitted when a token swap is executed.
    /// @param user The address of the user who receives the swapped tokens.
    /// @param tokenOut The address of the ERC20 token being swapped.
    /// @param amount The amount of tokens swapped.
    event Swapped(address indexed user, address tokenOut, uint256 amount);

    /// @notice Constructs the SwapMock contract.
    /// @dev Initializes the contract with a specific ERC20 token address.
    /// @param _erc20 The address of the ERC20 token that will be used in swaps.
    constructor(address _erc20, address _endpoint, address _oApp) {
        erc20 = IERC20(_erc20);
        endpoint = _endpoint;
        oApp = _oApp;
    }

    /// @notice Handles incoming composed messages from LayerZero.
    /// @dev Decodes the message payload to perform a token swap.
    ///      This method expects the encoded compose message to contain the swap amount and recipient address.
    /// @param _oApp The address of the originating OApp.
    /// @param /*_guid*/ The globally unique identifier of the message (unused in this mock).
    /// @param _message The encoded message content, expected to be of type: (address receiver).
    /// @param /*Executor*/ Executor address (unused in this mock).
    /// @param /*Executor Data*/ Additional data for checking for a specific executor (unused in this mock).
    function lzCompose(
        address _oApp,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*Executor*/,
        bytes calldata /*Executor Data*/
    ) external payable override {
        require(_oApp == oApp, "!oApp");
        require(msg.sender == endpoint, "!endpoint");
        // Extract the composed message from the delivered message using the MsgCodec
        address _receiver = abi.decode(OFTComposeMsgCodec.composeMsg(_message), (address));
        uint256 _amountLD = OFTComposeMsgCodec.amountLD(_message);
        // Execute the token swap by transferring the specified amount to the receiver
        erc20.safeTransfer(_receiver, _amountLD);

        // Emit an event to log the token swap details
        emit Swapped(_receiver, address(erc20), _amountLD);
    }
}