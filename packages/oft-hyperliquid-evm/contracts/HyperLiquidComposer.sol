// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidWritePrecompile } from "./interfaces/IHyperLiquidWritePrecompile.sol";
import { IHyperLiquidComposerErrors } from "./interfaces/IHyperLiquidComposerErrors.sol";

import { HyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount } from "./HyperLiquidComposerCore.sol";

contract HyperLiquidComposer is HyperLiquidComposerCore, IOAppComposer {
    using HyperLiquidComposerCodec for uint64;

    /// @notice Constructor for the HyperLiquidComposer contract
    /// @notice This only supports ERC20 tokens
    ///
    /// @dev This constructor is called by the `HyperLiquidOFT` contract
    /// @dev Post deployment, this address needs to be approved (via approveCaller) by the `owner` of the `HyperLiquidOFT` contract to call the `transferToHyperLiquidL1` function
    ///
    /// @param _endpoint The LayerZero endpoint address
    /// @param _oft The OFT contract address associated with this composer
    /// @param _coreIndexId The core index id of the HyperLiquid L1 contract
    /// @param _weiDiff The difference in decimals between the HyperEVM OFT deployment and HyperLiquid L1 HIP-1 listing
    constructor(address _endpoint, address _oft, uint64 _coreIndexId, uint64 _weiDiff) {
        /// @dev Hyperliquid L1 contract address is the prefix (0x2000...0000) + the core index id
        /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens between HyperEVM and HyperLiquid L1
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        oftAsset = IHyperAsset({
            assetBridgeAddress: _coreIndexId.into_assetBridgeAddress(),
            coreIndexId: _coreIndexId,
            decimalDiff: _weiDiff
        });

        /// @dev HYPE Core Spot address on HyperLiquid L1 - is a special address which is a precompile and has it's own asset bridge address which can be found here:
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        /// @dev The following contains information about the HYPE Core Spot:
        /// @dev https://app.hyperliquid-testnet.xyz/explorer/token/0x7317beb7cceed72ef0b346074cc8e7ab
        hypeAsset = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: 1105,
            /// @dev 18 is the number of decimals in the HYPE token on HyperEVM
            /// @dev 8 is the number of decimals in the HYPE Core Spot on HyperLiquid L1
            decimalDiff: 18 - 8
        });

        // Used during validation of the lzCompose call
        oft = IOFT(_oft);
        token = IERC20(oft.token());
        endpoint = _endpoint;
    }

    /// @notice Composes a message to be sent to the HyperLiquidComposer
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
    ) external payable virtual override {
        /// @dev The following reverts are for when the contract is incorrectly called.
        /// @dev There are no refunds involved in these reverts.
        // Validate the composeCall based on the docs - https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions#receiving-compose

        if (address(endpoint) != msg.sender) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotEndpoint(
                address(endpoint),
                msg.sender
            );
        }

        if (address(oft) != _oft) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotOFT(address(oft), _oft);
        }

        address receiver;
        uint256 amountLD;
        bytes32 maybeEVMSender;
        bytes memory maybeEVMReceiver;

        /// @dev Checks if the payload contains a compose message that can be sliced to extract the amount, sender as bytes32, and receiver as bytes
        /// @dev The slice ranges can be found in OFTComposeMsgCodec.sol
        /// @dev If the payload is invalid, the function will revert with the error message and there is no refunds
        try this.validate_payload(_message) returns (
            uint256 _amountLD,
            bytes32 _maybeSenderBytes32,
            bytes memory _maybeEVMReceiver
        ) {
            amountLD = _amountLD;
            maybeEVMSender = _maybeSenderBytes32;
            maybeEVMReceiver = _maybeEVMReceiver;
        } catch (bytes memory _err) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidComposeMessage(_err);
        }

        /// @dev Checks if the receiver and sender are valid addresses
        /// @dev If the addresses are invalid, the function will emit an error message and try a complete refund to the receiver else the sender
        /// @dev If developers want custom error messages they need to implement their own custom revert messages
        try this.validate_addresses_or_refund(maybeEVMReceiver, maybeEVMSender, amountLD) returns (address _receiver) {
            receiver = _receiver;
        } catch (bytes memory _err) {
            bytes memory errMsg = completeRefund(_err);
            emit ErrorMessage(errMsg);
            // Pre-emptive return after the refund
            return;
        }

        /// @dev If the message is being sent with a value, we fund the address on HyperCore
        if (msg.value > 0) {
            _fundAddressOnHyperCore(receiver, msg.value);
        }

        _sendAssetToHyperCore(receiver, amountLD);
    }

    /// @notice Transfers the asset to the _receiver on HyperCore through the SpotSend precompile
    /// @notice Transfers any leftover dust to the _receiver
    /// @notice This function is called by the lzCompose function
    ///
    /// @dev The composer transfers the tokens to it's address on HyperCore
    /// @dev The composer then transfers the tokens from it's address on HyperCore to the _receiver via the SpotSend precompile
    /// @dev The SpotSend precompile is a precompile on HyperEVM that allows for token transfers on HyperCore
    ///
    /// @dev The transfer to HyperCore via the assetBridgeAddress and the SpotSend precompile is done in the same transaction
    /// @dev Hyperliquid guarantees sequential transactions but not atomicity of the transfer.
    /// @dev Transfers are primitive transactions and are always expected to pass.
    ///
    /// @param _receiver The address of the receiver
    /// @param _amountLD The amount of tokens to send
    function _sendAssetToHyperCore(address _receiver, uint256 _amountLD) internal virtual {
        /// @dev Computes the tokens to send to HyperCore, dust (refund amount), and the swap amount.
        /// @dev It also takes into account the maximum transferable amount at any given time.
        /// @dev This is done by reading from HLP_PRECOMPILE_READ_SPOT_BALANCE the tokens on the HyperCore side of the asset bridge
        ///
        /// @notice The swap amount (HIP1) and tokens to send (ERC20) are different because they have different decimals
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(_amountLD, true);

        /// Transfers the tokens to the composer address on HyperCore
        token.transfer(oftAsset.assetBridgeAddress, amounts.evm);

        /// Transfers tokens from the composer address on HyperCore to the _receiver
        IHyperLiquidWritePrecompile(HLP_PRECOMPILE_WRITE).sendSpot(_receiver, oftAsset.coreIndexId, amounts.core);

        /// Transfers any leftover dust to the _receiver on HyperEVM
        if (amounts.dust > 0) {
            token.transfer(_receiver, amounts.dust);
        }
    }

    /// @notice Funds the address on HyperCore with the amount of HYPE tokens
    /// @notice This function is called by the lzCompose function
    /// @notice This is a precompile which makes it different to _sendAssetToHyperCore
    ///
    /// @dev The composer transfers HYPE that is received from the lzCompose call to it's address on HyperCore
    /// @dev The composer then transfers the HYPE from it's address on HyperCore to the _receiver via the SpotSend precompile
    /// @dev The SpotSend precompile is a precompile on HyperEVM that allows for token transfers on HyperCore
    ///
    /// @param _receiver The address of the receiver
    /// @param _amount The amount of HYPE tokens to send
    function _fundAddressOnHyperCore(address _receiver, uint256 _amount) internal virtual {
        /// @dev Computes the tokens to send to HyperCore, dust (refund amount), and the swap amount.
        /// @dev It also takes into account the maximum transferable amount at any given time.
        /// @dev This is done by reading from HLP_PRECOMPILE_READ_SPOT_BALANCE the tokens on the HyperCore side of the asset bridge
        ///
        /// @notice The swap amount (HIP1) and tokens to send (ERC20) are different because they have different decimals
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(_amount, false);

        /// Transfers the HYPE tokens to the composer address on HyperCore
        (bool success, ) = payable(hypeAsset.assetBridgeAddress).call{ value: amounts.evm }("");
        if (!success) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_FailedToSend_HYPE(_amount);
        }

        /// Transfers HYPE tokens from the composer address on HyperCore to the _receiver via the SpotSend precompile
        IHyperLiquidWritePrecompile(HLP_PRECOMPILE_WRITE).sendSpot(_receiver, hypeAsset.coreIndexId, amounts.core);

        /// @dev Tries transferring any leftover dust to the _receiver on HyperEVM
        /// @dev If the transfer fails, we refund the tx.origin as to not have any dust locked in the contract
        if (amounts.dust > 0) {
            try this.refundNativeTokens{ value: amounts.dust }(_receiver) {} catch {
                (success, ) = tx.origin.call{ value: amounts.dust }("");
                if (!success) {
                    emit ErrorHYPE_Refund(tx.origin, amounts.dust);
                }
                emit ErrorHYPE_Refund(_receiver, amounts.dust);
            }
        }
    }

    receive() external payable {}
}
