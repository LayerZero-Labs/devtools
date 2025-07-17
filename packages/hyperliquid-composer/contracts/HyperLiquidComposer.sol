// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposerErrors } from "./interfaces/IHyperLiquidComposerErrors.sol";
import { ICoreWriter } from "./interfaces/ICoreWriter.sol";

import { HyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount } from "./HyperLiquidComposerCore.sol";

contract HyperLiquidComposer is HyperLiquidComposerCore, IOAppComposer {
    using SafeERC20 for IERC20;

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
    /// @param _assetDecimalDiff The difference in decimals between the HyperEVM OFT deployment and HyperLiquid L1 HIP-1 listing
    constructor(
        address _endpoint,
        address _oft,
        uint64 _coreIndexId,
        int64 _assetDecimalDiff
    ) HyperLiquidComposerCore(_endpoint, _oft) {
        /// @dev Hyperliquid L1 contract address is the prefix (0x2000...0000) + the core index id
        /// @dev This is the address that the OFT contract will transfer the tokens to when we want to send tokens between HyperEVM and HyperLiquid L1
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        oftAsset = IHyperAsset({
            assetBridgeAddress: _coreIndexId.into_assetBridgeAddress(),
            coreIndexId: _coreIndexId,
            decimalDiff: _assetDecimalDiff
        });

        /// @dev HYPE Core Spot address on HyperLiquid L1 - is a special address which is a precompile and has it's own asset bridge address which can be found here:
        /// @dev https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm/hypercore-less-than-greater-than-hyperevm-transfers#system-addresses
        /// @dev The following contains information about the HYPE Core Spot:
        /// @dev https://app.hyperliquid-testnet.xyz/explorer/token/0x7317beb7cceed72ef0b346074cc8e7ab
        hypeAsset = IHyperAsset({
            assetBridgeAddress: 0x2222222222222222222222222222222222222222,
            coreIndexId: hypeIndexByChainId[block.chainid],
            /// @dev 18 is the number of decimals in the HYPE token on HyperEVM
            /// @dev 8 is the number of decimals in the HYPE Core Spot on HyperLiquid L1
            decimalDiff: 18 - 8
        });
    }

    /// @notice Composes a message to be sent to the HyperLiquidComposer
    /// @notice This function is the only new addition to the OFT standard
    ///
    /// @dev This function is called by the OFTCore contract when a message is sent
    ///
    /// @param _oft The address of the OFT contract.
    /// @param _message The encoded message content, expected to contain a composeMsg that decodes to type: (address receiver, uint256 msgValue).
    /// @param _executor The address that called EndpointV2::lzCompose()
    function lzCompose(
        address _oft,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address _executor,
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
        bytes memory composeMsg;

        /// @dev Checks if the payload contains a compose message that can be sliced to extract the amount, sender as bytes32, and receiver as bytes
        /// @dev The slice ranges can be found in OFTComposeMsgCodec.sol
        /// @dev If the payload is invalid, the function will revert with the error message and there is no refunds
        try this.validate_message(_message) returns (
            uint256 _amountLD,
            bytes32 _maybeSenderBytes32,
            bytes memory _composeMsg
        ) {
            amountLD = _amountLD;
            maybeEVMSender = _maybeSenderBytes32;
            composeMsg = _composeMsg;
        } catch (bytes memory _err) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidComposeMessage(_err);
        }

        /// @dev Checks if the receiver and sender are valid addresses
        /// @dev If the addresses are invalid, the function will emit an error message and try a complete refund to the sender
        /// @dev If developers want custom error messages they need to implement their own custom revert messages
        try this.validate_msg_or_refund(composeMsg, maybeEVMSender, amountLD) returns (
            uint256 _minMsgValue,
            address _receiver
        ) {
            if (msg.value < _minMsgValue) revert IHyperLiquidComposerErrors.NotEnoughMsgValue(msg.value, _minMsgValue);

            receiver = _receiver;
        } catch (bytes memory _err) {
            bytes memory errMsg = completeRefund(_err, _executor);
            emit ErrorMessage(errMsg);
            // Pre-emptive return after the refund
            return;
        }

        /// @dev If the message is being sent with a value, we fund the address on HyperCore
        if (msg.value > 0) {
            ///
            try this.fundAddressOnHyperCore(receiver, msg.value, _executor) {} catch (bytes memory _err) {
                /// @dev The gas token on HyperCore is USDC at the moment, the outcome of a failed HYPE transfer is invariant of the ERC20 transfer
                /// @dev When HYPE is the gas token on HyperCore, we MAY want to stop execution and perform a completeRefund()
                /// @dev This would require composer redeployment
                try this.refundNativeTokens{ value: msg.value }(receiver) {} catch {
                    /// @dev When we can not refund the receiver, we refund the tx.origin
                    /// @dev If this fails, we do not revert as we still want to transfer the ERC20 to hypercore
                    (bool succ, bytes memory data) = (tx.origin).call{ value: msg.value }("");
                    if (!succ) {
                        emit ErrorMessage(data);
                    }
                }
                emit ErrorMessage(_err);
            }
        }

        /// @dev We always want to transfer the ERC20 tokens to HyperCore
        try this.sendAssetToHyperCore(receiver, amountLD) {} catch (bytes memory _err) {
            this.refundERC20(receiver, amountLD);
            emit ErrorSpot_FailedToSend(receiver, oftAsset.coreIndexId, amountLD, _err);
        }
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
    function sendAssetToHyperCore(address _receiver, uint256 _amountLD) external virtual onlyComposer {
        /// @dev Computes the tokens to send to HyperCore, dust (refund amount), and the swap amount.
        /// @dev It also takes into account the maximum transferable amount at any given time.
        /// @dev This is done by reading from HLP_PRECOMPILE_READ_SPOT_BALANCE the tokens on the HyperCore side of the asset bridge
        ///
        /// @notice The swap amount (HIP1) and tokens to send (ERC20) are different because they have different decimals
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(_amountLD, true);

        // Since amounts.evm and amounts.core differ by decimalDiff if evm is greater than 0 we have a transfer into HyperCore and must make a HyperCore transfer to the receiver
        if (amounts.evm > 0) {
            /// Transfers the tokens to the composer address on HyperCore
            token.safeTransfer(oftAsset.assetBridgeAddress, amounts.evm);

            bytes memory action = abi.encode(_receiver, oftAsset.coreIndexId, amounts.core);
            bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
            /// Transfers tokens from the composer address on HyperCore to the _receiver
            ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
        }
        /// Transfers any leftover dust to the _receiver on HyperEVM
        if (amounts.dust > 0) {
            token.safeTransfer(_receiver, amounts.dust);
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
    function fundAddressOnHyperCore(
        address _receiver,
        uint256 _amount,
        address _executor
    ) external virtual onlyComposer {
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

        bytes memory action = abi.encode(_receiver, hypeAsset.coreIndexId, amounts.core);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        /// Transfers HYPE tokens from the composer address on HyperCore to the _receiver via the SpotSend precompile
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);

        /// @dev Tries transferring any leftover dust to the _receiver on HyperEVM
        /// @dev If the transfer fails, we try refunding it to the executor and if that fails then we refund the tx.origin as to not have any dust locked in the contract
        if (amounts.dust > 0) {
            // We know this _receiver address is a valid evm-address however it could be a contract with no fallback
            try this.refundNativeTokens{ value: amounts.dust }(_receiver) {
                emit ExcessHYPE_Refund(_receiver, amounts.dust);
            } catch {
                // Try refunding the executor and if that fails then refund tx.origin
                (success, ) = _executor.call{ value: amounts.dust }("");
                if (success) {
                    emit ExcessHYPE_Refund(_executor, amounts.dust);
                } else {
                    // Finally refund the transaction origin - we know this is an eoa and can accept tokens
                    (success, ) = tx.origin.call{ value: amounts.dust }("");
                    emit ExcessHYPE_Refund(tx.origin, amounts.dust);
                }
            }
        }
    }

    receive() external payable {}
}
