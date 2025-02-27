// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { HyperLiquidOFTComposeMsgCodec } from "./library/HyperLiquidOFTComposeMsgCodec.sol";

import { IHyperLiquidComposer } from "./interfaces/IHyperLiquidComposer.sol";
import { IHyperLiquidERC20Extended } from "./interfaces/IHyperLiquidERC20Extended.sol";

contract HyperLiquidLZComposer is IHyperLiquidComposer {
    address public immutable endpoint;
    address public immutable oApp;
    IHyperLiquidERC20Extended public immutable oappExtendedToken;

    /// @notice Constructor for the HyperLiquidLZComposer contract
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @param _endpoint The LayerZero endpoint address
    /// @param _oApp The OFT contract address associated with this composer
    /// @dev Post deployment, this address needs to be approved (via approveCaller) by the `owner` of the `HyperLiquidOFT` contract to call the `transferToHyperLiquidL1` function
    constructor(address _endpoint, address _oApp) {
        // Validate that the OFT contract implements the `IHyperLiquidERC20Extended` interface
        // This is to ensure that the OFT contract has the `transferToHyperLiquidL1` function
        oappExtendedToken = IHyperLiquidERC20Extended(IOFT(_oApp).token());
        if (!oappExtendedToken.implementsExtendedFunctionality()) {
            revert HyperLiquidComposer_InvalidCall_TokenDoesNotSupportExtension(_oApp, address(oappExtendedToken));
        }

        endpoint = _endpoint;
        oApp = _oApp;
    }

    /// @notice Composes a message to be sent to the HyperLiquidComposer
    /// @dev This function is called by the OFTCore contract when a message is sent
    /// @notice This function is the only new addition to the OFT standard
    /// @param _oApp The address of the OFT adapter contract.
    /// @param _message The encoded message content, expected to be of type: (address receiver).
    function lzCompose(
        address _oApp,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        // Validate the composeCall based on the docs - https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions#receiving-compose
        if (msg.sender != address(endpoint)) {
            revert HyperLiquidComposer_InvalidCall_NotEndpoint(msg.sender);
        }

        if (oApp != _oApp) {
            revert HyperLiquidComposer_InvalidCall_NotOFT(oApp, _oApp);
        }

        // Validate the message and decode it -
        // The message is expected to be of type: (address receiver)
        // The bytes object should be encoded as an abi.encodePacked() of the receiver address
        // This is found as SendParam.composeMsg that the OFTCore contract populates on the send() call
        (address _receiver, uint256 _amountLD) = HyperLiquidOFTComposeMsgCodec.validateAndDecodeMessage(_message);

        // Transfer the tokens to the HyperLiquid L1 contract
        // This creates the Transfer event that HyperLiquid L1 listens for
        // IERC20.Transfer(_receiver, 0x2222222222222222222222222222222222222222, _amountLD)
        oappExtendedToken.transferToHyperLiquidL1(_receiver, _amountLD);
    }
}
