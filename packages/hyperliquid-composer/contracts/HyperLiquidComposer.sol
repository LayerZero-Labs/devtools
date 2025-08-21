// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOFT, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { HyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount, FailedMessage } from "./HyperLiquidComposerCore.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Hyperliquid Composer
 * @author LayerZero Labs (@shankars99)
 * @notice This contract is a composer that allows transfers of ERC20 and HYPE tokens to a target address on hypercore.
 * @dev This address needs to be "activated" on hypercore post deployment
 */
contract HyperLiquidComposer is HyperLiquidComposerCore, ReentrancyGuard, IOAppComposer {
    using SafeERC20 for IERC20;
    using HyperLiquidComposerCodec for uint64;

    /**
     * @param _oft The OFT contract address associated with this composer
     * @param _coreIndexId The core index id of the HyperLiquid L1 contract
     * @param _assetDecimalDiff The difference in decimals between the HyperEVM OFT deployment and HyperLiquid L1 HIP-1 listing
     * @param _REFUND_ADDRESS Address that receives excess tokens after a refund(). it MUST be able to receive native tokens.
     */
    constructor(
        address _oft,
        uint64 _coreIndexId,
        int64 _assetDecimalDiff,
        address _REFUND_ADDRESS
    ) HyperLiquidComposerCore(_oft) {
        /// @dev Asset bridge address is the prefix (0x2000...0000) + the core index id
        /// @dev This is used to transfer tokens between the ERC20 and CoreSpot
        oftAsset = IHyperAsset({
            decimalDiff: _assetDecimalDiff,
            coreIndexId: _coreIndexId,
            assetBridgeAddress: _coreIndexId.into_assetBridgeAddress()
        });

        REFUND_ADDRESS = _REFUND_ADDRESS;
    }

    /**
     * @notice Handles LayerZero compose operations for hypercore transfers with refund to source and refund on hyperevm functionality
     * @dev This composer is designed to handle refunds to source to an EOA address and NOT a contract
     * @dev If the HyperCore receiver is a contract on hyperevm, it is expected that you can control token balance via CoreWriter
     * @param _oft The address of the OFT contract.
     * @param _message The encoded message content, expected to contain a composeMsg that decodes to type: (address receiver, uint256 msgValue)
     */
    function lzCompose(
        address _oft,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override nonReentrant {
        /// @dev Proxy gas check for enforced options. Can be retried from the endpoint with sufficient gas.
        if (gasleft() < MIN_GAS) revert InsufficientGas(gasleft(), MIN_GAS);

        if (msg.sender != ENDPOINT) revert OnlyEndpoint();
        if (address(OFT) != _oft) revert InvalidComposeCaller(address(OFT), _oft);

        /// @dev Since these are populated by the OFT contract, we can safely assume they are always decodeable
        uint256 amount = OFTComposeMsgCodec.amountLD(_message);
        bytes memory composeMsgEncoded = OFTComposeMsgCodec.composeMsg(_message);

        address receiver;

        /// @dev Decode message to get receiver, store in failedMessages if decode fails
        try this.decode_message(composeMsgEncoded) returns (uint256 _minMsgValue, address _receiver) {
            if (msg.value < _minMsgValue) revert InsufficientMsgValue(msg.value, _minMsgValue);
            receiver = _receiver;
        } catch {
            SendParam memory refundSendParam;
            refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
            refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
            refundSendParam.amountLD = amount;

            failedMessages[_guid] = FailedMessage({ refundSendParam: refundSendParam, msgValue: msg.value });
            emit FailedMessageDecode(_guid, refundSendParam.to, msg.value, composeMsgEncoded);
            return;
        }

        uint256 refundHYPE;
        uint256 refundERC20;

        /// @dev If HyperEVM -> HyperCore fails for HYPE OR ERC20 then we do a complete refund to the receiver on hyperevm
        try this.handleCoreTransfers{ value: msg.value }(receiver, amount) returns (
            uint256 dustHYPE,
            uint256 dustERC20
        ) {
            refundHYPE = dustHYPE;
            refundERC20 = dustERC20;
        } catch {
            refundHYPE = msg.value;
            refundERC20 = amount;
        }

        /// @dev multi-utility function that either refunds dust (evm and core decimal difference) or a complete refund
        _hyperevmRefund(receiver, refundHYPE, refundERC20);
    }

    /**
     * @notice Decodes the compose message to extract minMsgValue and receiver address
     * @param _composeMessage The encoded compose message
     * @return minMsgValue The minimum message value required
     * @return receiver The receiver address
     */
    function decode_message(
        bytes calldata _composeMessage
    ) external pure returns (uint256 minMsgValue, address receiver) {
        if (_composeMessage.length != VALID_COMPOSE_MSG_LEN) revert ComposeMsgLengthNot64Bytes(_composeMessage.length);

        (minMsgValue, receiver) = abi.decode(_composeMessage, (uint256, address));
    }

    /**
     * @dev Transfers native and erc20 to HyperCore via asset bridge, then to receiver via CoreWriter. Returns dust to HyperEVM.
     * @dev If either fails then we complete refund the user on HyperEVM
     */
    function handleCoreTransfers(
        address _receiver,
        uint256 _amount
    ) external payable returns (uint256 dustHYPE, uint256 dustERC20) {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        dustERC20 = transferERC20HyperCore(_receiver, _amount);

        if (msg.value > 0) {
            dustHYPE = transferNativeHyperCore(_receiver);
        }
    }

    /**
     * @notice Transfers ERC20 tokens to HyperCore
     * @param _receiver The address to receive tokens on HyperCore
     * @param _amountLD The amount of tokens to transfer in LayerZero decimals
     * @return The dust amount to be refunded on HyperEVM
     */
    function transferERC20HyperCore(address _receiver, uint256 _amountLD) internal virtual returns (uint256) {
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(_amountLD, true);

        if (amounts.evm != 0) {
            // Transfer the tokens to the composer's address on HyperCore
            IERC20(TOKEN).safeTransfer(oftAsset.assetBridgeAddress, amounts.evm);
            _submitCoreWriterTransfer(_receiver, oftAsset.coreIndexId, amounts.core);
        }

        return amounts.dust;
    }

    /**
     * @notice Transfers native HYPE tokens to HyperCore
     * @param _receiver The address to receive tokens on HyperCore
     * @return The dust amount to be refunded on HyperEVM
     */
    function transferNativeHyperCore(address _receiver) internal virtual returns (uint256) {
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(msg.value, false);

        if (amounts.evm != 0) {
            address to = hypeAsset.assetBridgeAddress;
            // Transfer the HYPE tokens to the composer's address on HyperCore
            (bool success, ) = payable(to).call{ value: amounts.evm, gas: NATIVE_TRANSFER_GAS }("");
            if (!success) revert NativeTransferFailed(to, amounts.evm);

            _submitCoreWriterTransfer(_receiver, hypeAsset.coreIndexId, amounts.core);
        }

        return amounts.dust;
    }

    receive() external payable {}
}
