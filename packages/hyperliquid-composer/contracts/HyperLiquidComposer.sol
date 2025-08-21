// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IOFT, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposerErrors } from "./interfaces/IHyperLiquidComposerErrors.sol";
import { ICoreWriter } from "./interfaces/ICoreWriter.sol";

import { HyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount, FailedMessage } from "./HyperLiquidComposerCore.sol";

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
    /// @param _REFUND_ADDRESS Address that receives excess tokens after a refund(). it MUST be able to receive native tokens.
    constructor(
        address _endpoint,
        address _oft,
        uint64 _coreIndexId,
        int64 _assetDecimalDiff,
        address _REFUND_ADDRESS
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

        REFUND_ADDRESS = _REFUND_ADDRESS;
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
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        /// @dev Proxy gas check for enforced options. Can be retried from the endpoint with sufficient gas.
        if (gasleft() < MIN_GAS) revert IHyperLiquidComposerErrors.HyperLiquidComposer_NotEnoughGas(gasleft(), MIN_GAS);

        /// @dev The following reverts are for when the contract is incorrectly called.
        /// @dev There are no refunds involved in these reverts.
        // Validate the composeCall based on the docs - https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions#receiving-compose

        if (address(endpoint) != msg.sender) {
            revert IHyperLiquidComposerErrors.NotEndpoint(address(endpoint), msg.sender);
        }

        if (address(oft) != _oft) {
            revert IHyperLiquidComposerErrors.NotOFT(address(oft), _oft);
        }

        address receiver;

        /// @dev Since these are populated by the OFT contract, we can safely assume they are always decodeable
        uint256 amountLD = OFTComposeMsgCodec.amountLD(_message);
        bytes memory composeMsgEncoded = OFTComposeMsgCodec.composeMsg(_message);

        /// @dev Checks if the payload contains a compose message that can be sliced to extract the amount, sender as bytes32, and receiver as bytes
        /// @dev The slice ranges can be found in OFTComposeMsgCodec.sol
        /// @dev If the payload is invalid, the function will revert with the error message and there is no refunds
        try this.decode_message(composeMsgEncoded) returns (uint256 _minMsgValue, address _receiver) {
            if (_minMsgValue > msg.value)
                revert IHyperLiquidComposerErrors.InsufficientMsgValue(msg.value, _minMsgValue);

            receiver = _receiver;
        } catch {
            /// @dev The msgValue passed will be re-used to pay for the layerzero message
            /// @dev The excess will be transferred to the REFUND_ADDRESS

            SendParam memory refundSendParam;
            refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
            refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
            refundSendParam.amountLD = amountLD;

            failedMessages[_guid] = FailedMessage({ refundSendParam: refundSendParam, msgValue: msg.value });
            emit FailedMessageDecode(_guid, refundSendParam.to, msg.value, composeMsgEncoded);
            return;
        }

        /// @dev If the message is being sent with a value, we fund the address on HyperCore
        if (msg.value > 0) {
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
                    /// @dev If this fails we are fine with the tokens staying the composer contract
                    (success, ) = tx.origin.call{ value: amounts.dust }("");
                    emit ExcessHYPE_Refund(tx.origin, amounts.dust);
                }
            }
        }
    }

    receive() external payable {}
}
