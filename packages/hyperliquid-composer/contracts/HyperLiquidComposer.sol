// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { HyperLiquidCore } from "./HyperLiquidCore.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposer, IHyperAsset, IHyperAssetAmount, FailedMessage } from "./interfaces/IHyperLiquidComposer.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Hyperliquid Composer
 * @author LayerZero Labs (@shankars99)
 * @notice This contract is a composer that allows transfers of ERC20 and HYPE tokens to a target address on hypercore.
 * @dev This address needs to be "activated" on hypercore post deployment
 */
contract HyperLiquidComposer is HyperLiquidCore, ReentrancyGuard, IHyperLiquidComposer, IOAppComposer {
    using SafeERC20 for IERC20;
    using HyperLiquidComposerCodec for *; /// @dev applies to bytes, bytes32, uint256, uint64

    /// @dev Minimum gas to be supplied to the composer contract for execution to prevent Out of Gas.
    uint256 public constant MIN_GAS = 150_000;
    uint256 public constant VALID_COMPOSE_MSG_LEN = 64; /// @dev abi.encode(uint256,address) = 32+32

    address public immutable ENDPOINT;
    address public immutable OFT;
    address public immutable ERC20;

    IHyperAsset public erc20Asset; /// @dev EVM token
    IHyperAsset public hypeAsset; /// @dev Hype token

    mapping(bytes32 guid => FailedMessage) public failedMessages;

    /**
     * @param _oft The OFT contract address associated with this composer
     * @param _coreIndexId The core index id of the HyperLiquid L1 contract
     * @param _assetDecimalDiff The difference in decimals between the HyperEVM OFT deployment and HyperLiquid L1 HIP-1 listing
     */
    constructor(address _oft, uint64 _coreIndexId, int64 _assetDecimalDiff) {
        if (_oft == address(0)) revert InvalidOFTAddress();

        ENDPOINT = address(IOAppCore(_oft).endpoint());

        OFT = _oft;
        ERC20 = IOFT(OFT).token();

        uint64 hypeCoreIndex = block.chainid == HYPE_CHAIN_ID_MAINNET
            ? HYPE_CORE_INDEX_MAINNET
            : HYPE_CORE_INDEX_TESTNET;

        /// @dev HYPE system contract address for Core<->EVM transfers
        hypeAsset = IHyperAsset({
            decimalDiff: HYPE_DECIMAL_DIFF,
            coreIndexId: hypeCoreIndex,
            assetBridgeAddress: HYPE_ASSET_BRIDGE
        });

        /// @dev Asset bridge address is the prefix (0x2000...0000) + the core index id
        /// @dev This is used to transfer tokens between the ERC20 and CoreSpot
        erc20Asset = IHyperAsset({
            decimalDiff: _assetDecimalDiff,
            coreIndexId: _coreIndexId,
            assetBridgeAddress: _coreIndexId.into_assetBridgeAddress()
        });
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
        if (msg.sender != ENDPOINT) revert OnlyEndpoint();
        if (OFT != _oft) revert InvalidComposeCaller(address(OFT), _oft);

        /// @dev Since these are populated by the OFT contract, we can safely assume they are always decodeable
        uint256 amount = OFTComposeMsgCodec.amountLD(_message);
        bytes memory composeMsgEncoded = OFTComposeMsgCodec.composeMsg(_message);

        /// @dev Decode message to get receiver and perform hypercore transfers, store in failedMessages if decode fails
        try this.decodeMessage(composeMsgEncoded) returns (uint256 _minMsgValue, address _to) {
            if (msg.value < _minMsgValue) revert InsufficientMsgValue(msg.value, _minMsgValue);

            /// @dev Gas check before executing hypercore precompile operations. Can be retried from the endpoint with sufficient gas.
            if (gasleft() < MIN_GAS) revert InsufficientGas(gasleft(), MIN_GAS);

            /// @dev If HyperEVM -> HyperCore fails for HYPE OR ERC20 then we do a complete refund to the receiver on hyperevm
            /// @dev try...catch to safeguard against possible breaking hyperliquid pre-compile changes
            try this.handleCoreTransfers{ value: msg.value }(_to, amount) {} catch {
                _hyperevmRefund(_to, amount);
            }
        } catch {
            SendParam memory refundSendParam;
            refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
            refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
            refundSendParam.amountLD = amount;

            failedMessages[_guid] = FailedMessage({ refundSendParam: refundSendParam, msgValue: msg.value });
            emit FailedMessageDecode(_guid, refundSendParam.to, msg.value, composeMsgEncoded);
        }
    }

    /**
     * @notice Decodes the compose message to extract minMsgValue and receiver address
     * @param _composeMessage The encoded compose message
     * @return minMsgValue The minimum message value required
     * @return receiver The receiver address
     */
    function decodeMessage(
        bytes calldata _composeMessage
    ) external pure returns (uint256 minMsgValue, address receiver) {
        if (_composeMessage.length != VALID_COMPOSE_MSG_LEN) revert ComposeMsgLengthNot64Bytes(_composeMessage.length);

        (minMsgValue, receiver) = abi.decode(_composeMessage, (uint256, address));
    }

    /**
     * @dev Transfers native and erc20 to HyperCore via asset bridge, then to receiver via CoreWriter. Returns dust to HyperEVM.
     * @dev If either fails then we complete refund the user on HyperEVM
     * @dev Default behavior checks if the user is activated on HyperCore in ERC20 transfer, if not then revert this call
     * @dev If the user requests for more funds than the asset bridge's balance we revert
     */
    function handleCoreTransfers(address _to, uint256 _amount) external payable {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        _checkAndTransferERC20HyperCore(_to, _amount);

        if (msg.value > 0) {
            _transferNativeHyperCore(_to);
        }
    }

    /**
     * @notice Transfers ERC20 tokens to HyperCore
     * @notice Checks if the receiver's address is activated on HyperCore
     * @notice To be overriden on FeeToken or other implementations since this can be used to activate tokens
     * @notice If the user requests for more funds than the asset bridge's balance we revert
     * @param _to The address to receive tokens on HyperCore
     * @param _amountLD The amount of tokens to transfer in LayerZero decimals
     */
    function _checkAndTransferERC20HyperCore(address _to, uint256 _amountLD) internal virtual {
        // Cache erc20Asset to avoid multiple SLOAD operations
        IHyperAsset memory asset = erc20Asset;
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(_amountLD, asset);
        /// @dev This reverts if the user is not activated in the default case, else it simply returns `amounts.core`
        uint64 coreAmount = _getFinalCoreAmount(_to, amounts.core);

        if (amounts.core > amounts.coreBalanceAssetBridge) revert TransferAmtExceedsAssetBridgeBalance(amounts);

        /// @dev Moving tokens to asset bridge credits the coreAccount of composer with the tokens.
        /// @dev The write call then moves coreSpot tokens from the composer to receiver
        if (amounts.evm != 0) {
            // Transfer the tokens to the composer's address on HyperCore
            IERC20(ERC20).safeTransfer(asset.assetBridgeAddress, amounts.evm);
            _submitCoreWriterTransfer(_to, asset.coreIndexId, coreAmount);
        }
    }

    /**
     * @notice Transfers native HYPE tokens to HyperCore
     * @notice If the user requests for more funds than the asset bridge's balance we revert
     * @param _to The address to receive tokens on HyperCore
     */
    function _transferNativeHyperCore(address _to) internal virtual {
        // Cache hypeAsset to avoid multiple SLOAD operations
        IHyperAsset memory asset = hypeAsset;
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(msg.value, asset);
        if (amounts.core > amounts.coreBalanceAssetBridge) revert TransferAmtExceedsAssetBridgeBalance(amounts);

        if (amounts.evm != 0) {
            // Transfer the HYPE tokens to the composer's address on HyperCore
            (bool success, ) = payable(asset.assetBridgeAddress).call{ value: amounts.evm }("");
            if (!success) revert NativeTransferFailed(asset.assetBridgeAddress, amounts.evm);

            _submitCoreWriterTransfer(_to, asset.coreIndexId, amounts.core);
        }
    }

    /**
     * @notice Checks if the receiver's address is activated on HyperCore
     * @dev Default behavior is to revert if the user's account is NOT activated
     * @param _to The address to check
     * @param _coreAmount The core amount to transfer
     * @return The final core amount to transfer (same as _coreAmount in default impl)
     */
    function _getFinalCoreAmount(address _to, uint64 _coreAmount) internal view virtual returns (uint64) {
        if (!coreUserExists(_to).exists) revert CoreUserNotActivated();
        return _coreAmount;
    }

    /**
     * @notice Handles refunds on HyperEVM for both HYPE and ERC20 tokens
     * @dev Since this is an external function - the msg.value can be different to the msg.value sent to the lzCompose function by tx.origin
     * @dev It is different in the case of a partial refund where the call is:
     * @dev `this.refundNativeTokens{ value: amounts.dust }(_to)`
     * @dev In this case, the msg.value is the amount of the dust and not the msg.value sent to the lzCompose function by tx.origin
     * @param _refundAddress The address to refund tokens to
     * @param _erc20Amt The amount of ERC20 tokens to refund
     */
    function _hyperevmRefund(address _refundAddress, uint256 _erc20Amt) internal {
        if (msg.value != 0) {
            (bool success1, ) = _refundAddress.call{ value: msg.value }("");
            if (!success1) {
                (bool success2, ) = tx.origin.call{ value: msg.value }("");
                if (!success2) revert NativeTransferFailed(tx.origin, msg.value);
            }
        }

        if (_erc20Amt != 0) IERC20(ERC20).safeTransfer(_refundAddress, _erc20Amt);
    }

    /**
     * @notice External function to quote the conversion of evm tokens to hypercore tokens
     * @param _amount The amount of tokens to send
     * @param _asset The asset type (OFT or HYPE)
     * @return IHyperAssetAmount - The amount of tokens to send to HyperCore (scaled on evm), dust (to be refunded), and the swap amount (of the tokens scaled on hypercore)
     */
    function quoteHyperCoreAmount(
        uint256 _amount,
        IHyperAsset memory _asset
    ) public view returns (IHyperAssetAmount memory) {
        uint64 assetBridgeBalance = spotBalance(_asset.assetBridgeAddress, _asset.coreIndexId).total;
        return _amount.into_hyperAssetAmount(assetBridgeBalance, _asset);
    }

    /**
     * @notice Refunds failed messages to the source chain
     * @param _guid The GUID of the failed message to refund
     */
    function refundToSrc(bytes32 _guid) external payable virtual {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedMessage.refundSendParam.dstEid == 0) revert FailedMessageNotFound(_guid);

        delete failedMessages[_guid];

        uint256 totalMsgValue = failedMessage.msgValue + msg.value;

        /// @dev Triggers a refund via the OFT with the refundSendParam for the ERC20 amt
        /// @dev msg.value, if any was passed is used to pay the layerzero message fee and excess refunded to tx.origin
        IOFT(OFT).send{ value: totalMsgValue }(
            failedMessage.refundSendParam,
            MessagingFee(totalMsgValue, 0),
            tx.origin
        );

        /// @dev Emits the RefundSuccessful event
        emit RefundSuccessful(_guid);
    }

    receive() external payable {}
}
