// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { HyperCoreAdapter } from "@layerzerolabs/oft-hyperliquid-evm/contracts/HyperCoreAdapter.sol";
import { HyperLiquidComposerCodec } from "@layerzerolabs/oft-hyperliquid-evm/contracts/library/HyperLiquidComposerCodec.sol";
import { IHyperliquidWritePrecompile } from "@layerzerolabs/oft-hyperliquid-evm/contracts/interfaces/IHyperliquidWritePrecompile.sol";

contract WrappedHyperCoreAdapter is HyperCoreAdapter {
    constructor(
        address _lzEndpoint,
        address _oft,
        uint64 _hlIndexId,
        uint256 _weiDiff
    ) HyperCoreAdapter(_lzEndpoint, _oft, _hlIndexId, _weiDiff) {}

    /// @notice Composes a message to be sent to the HyperLiquidLZComposer
    /// @notice This function is the only new addition to the OFT standard
    ///
    /// @dev This function is called by the OFTCore contract when a message is sent
    ///
    /// @param _message The encoded message content, expected to be of type: (address receiver).
    function lzCompose(
        address /*_oft*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        // Validate the composeCall based on the docs - https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions#receiving-compose
        if (msg.sender != address(endpoint)) {
            revert HyperLiquidComposer_InvalidCall_NotEndpoint(msg.sender);
        }

        // Validate the message and decode it -
        // The message is expected to be of type: (address receiver)
        // The bytes object should be encoded as an abi.encodePacked() of the receiver address
        // This is found as SendParam.composeMsg that the OFTCore contract populates on the send() call
        (address _receiver, uint256 _amountLD) = HyperLiquidComposerCodec.validateAndDecodeMessage(_message);

        // If the message is being sent with a value, we need to fund the address on HyperCore
        // This is because the HyperCore contract is deployed with a zero balance
        if (msg.value > 0) {
            _fundAddressOnHyperCore(_receiver, msg.value);
        }

        // Transfer the tokens to the HyperLiquid L1 contract
        // This creates the Transfer event that HyperLiquid L1 listens for
        // IERC20.Transfer(_receiver, 0x2222222222222222222222222222222222222222, _amountLD)
        _sendAssetToHyperCore(_receiver, _amountLD);
    }
    function sendAssetToHyperCore(address receiever, uint256 amount) public {
        _sendAssetToHyperCore(receiever, amount);
    }

    function fundAddressOnHyperCore(address receiever, uint256 amount) public payable {
        _fundAddressOnHyperCore(receiever, amount);
    }
}
