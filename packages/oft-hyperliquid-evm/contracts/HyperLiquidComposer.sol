// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposer } from "./interfaces/IHyperLiquidComposer.sol";
import { IERC20HyperliquidHopTransferable } from "./interfaces/IERC20HyperliquidHopTransferable.sol";

contract HyperLiquidComposer is IHyperLiquidComposer {
    address public immutable OFT_TOKEN_ASSET_BRIDGE_ADDRESS;
    uint64 public immutable OFT_TOKEN_CORE_INDEX_ID;

    address public immutable endpoint;
    address public immutable oft;
    IERC20HyperliquidHopTransferable public immutable hyperliquidHopTransferableToken;

    /// @notice Constructor for the HyperLiquidLZComposer contract
    ///
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @dev Post deployment, this address needs to be approved (via approveCaller) by the `owner` of the `HyperLiquidOFT` contract to call the `transferToHyperLiquidL1` function
    ///
    /// @param _endpoint The LayerZero endpoint address
    /// @param _oft The OFT contract address associated with this composer
    constructor(address _endpoint, address _oft, uint64 _coreIndexId) {
        // Validate that the OFT contract implements the `IHyperLiquidERC20Extended` interface
        // This is to ensure that the OFT contract has the `transferToHyperLiquidL1` function
        hyperliquidHopTransferableToken = IERC20HyperliquidHopTransferable(IOFT(_oft).token());
        if (!hyperliquidHopTransferableToken.implementsHopTransferFunctionality()) {
            revert HyperLiquidComposer_InvalidCall_TokenDoesNotSupportExtension(
                _oft,
                address(hyperliquidHopTransferableToken)
            );
        }

        endpoint = _endpoint;
        oft = _oft;

        /// @dev Hyperliquid L1 contract address is the prefix + the core index id
        /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens to HyperLiquid L1
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        /// @dev It is formed by 0x2000...0000 + the core index id
        OFT_TOKEN_ASSET_BRIDGE_ADDRESS = HyperLiquidComposerCodec.into_assetBridgeAddress(_coreIndexId);
        OFT_TOKEN_CORE_INDEX_ID = _coreIndexId;
    }

    /// @notice Composes a message to be sent to the HyperLiquidLZComposer
    /// @notice This function is the only new addition to the OFT standard
    ///
    /// @dev This function is called by the OFTCore contract when a message is sent
    ///
    /// @param _oft The address of the OFT contract.
    /// @param _message The encoded message content, expected to be of type: (address receiver).
    function lzCompose(
        address _oft,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        // Validate the composeCall based on the docs - https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions#receiving-compose
        if (msg.sender != address(endpoint)) {
            revert HyperLiquidComposer_InvalidCall_NotEndpoint(msg.sender);
        }

        if (oft != _oft) {
            revert HyperLiquidComposer_InvalidCall_NotOFT(oft, _oft);
        }

        // Validate the message and decode it -
        // The message is expected to be of type: (address receiver)
        // The bytes object should be encoded as an abi.encodePacked() of the receiver address
        // This is found as SendParam.composeMsg that the OFTCore contract populates on the send() call
        (address _receiver, uint256 _amountLD) = HyperLiquidComposerCodec.validateAndDecodeMessage(_message);

        // Transfer the tokens to the HyperLiquid L1 contract
        // This creates the Transfer event that HyperLiquid L1 listens for
        // IERC20.Transfer(_receiver, 0x2222222222222222222222222222222222222222, _amountLD)
        hyperliquidHopTransferableToken.hopTransferToHyperLiquidL1(
            _receiver,
            OFT_TOKEN_ASSET_BRIDGE_ADDRESS,
            _amountLD
        );
    }
}
