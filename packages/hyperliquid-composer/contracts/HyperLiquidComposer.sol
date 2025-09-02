// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { HyperLiquidCore } from "./HyperLiquidCore.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposer, IHyperAssetAmount, FailedMessage } from "./interfaces/IHyperLiquidComposer.sol";

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

    uint256 public constant VALID_COMPOSE_MSG_LEN = 64; /// @dev abi.encode(uint256,address) = 32+32

    int8 public constant MIN_DECIMAL_DIFF = -2;
    int8 public constant MAX_DECIMAL_DIFF = 18;

    address public immutable ENDPOINT;
    address public immutable OFT;

    address public immutable NATIVE_ASSET_BRIDGE;
    int8 public immutable NATIVE_DECIMAL_DIFF;
    uint64 public immutable NATIVE_CORE_INDEX_ID;

    address public immutable ERC20;
    address public immutable ERC20_ASSET_BRIDGE;
    int8 public immutable ERC20_DECIMAL_DIFF;
    uint64 public immutable ERC20_CORE_INDEX_ID;

    mapping(bytes32 guid => FailedMessage) public failedMessages;

    /**
     * @param _oft The OFT contract address associated with this composer
     * @param _coreIndexId The core index id of the HyperLiquid L1 contract
     * @param _assetDecimalDiff The difference in decimals between the HyperEVM OFT deployment and HyperLiquid L1 HIP-1 listing
     */
    constructor(address _oft, uint64 _coreIndexId, int8 _assetDecimalDiff) {
        if (_oft == address(0)) revert InvalidOFTAddress();

        if (_assetDecimalDiff < MIN_DECIMAL_DIFF || _assetDecimalDiff > MAX_DECIMAL_DIFF)
            revert InvalidDecimalDiff(_assetDecimalDiff, MIN_DECIMAL_DIFF, MAX_DECIMAL_DIFF);

        ENDPOINT = address(IOAppCore(_oft).endpoint());

        OFT = _oft;

        uint64 hypeCoreIndex = block.chainid == HYPE_CHAIN_ID_MAINNET
            ? HYPE_CORE_INDEX_MAINNET
            : HYPE_CORE_INDEX_TESTNET;

        NATIVE_ASSET_BRIDGE = HYPE_ASSET_BRIDGE;
        NATIVE_DECIMAL_DIFF = HYPE_DECIMAL_DIFF;
        NATIVE_CORE_INDEX_ID = hypeCoreIndex;

        ERC20 = IOFT(OFT).token();
        ERC20_ASSET_BRIDGE = _coreIndexId.into_assetBridgeAddress();
        ERC20_DECIMAL_DIFF = _assetDecimalDiff;
        ERC20_CORE_INDEX_ID = _coreIndexId;
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
        uint256 amountLD = OFTComposeMsgCodec.amountLD(_message);
        bytes memory composeMsgEncoded = OFTComposeMsgCodec.composeMsg(_message);

        /// @dev Decode message to get receiver and perform hypercore transfers, store in failedMessages if decode fails
        try this.decodeMessage(composeMsgEncoded) returns (uint256 _minMsgValue, address _to) {
            if (msg.value < _minMsgValue) revert InsufficientMsgValue(msg.value, _minMsgValue);

            /// @dev Gas check before executing hypercore precompile operations. Can be retried from the endpoint with sufficient gas.
            if (gasleft() < MIN_GAS()) revert InsufficientGas(gasleft(), MIN_GAS());

            /// @dev If HyperEVM -> HyperCore fails for HYPE OR ERC20 then we do a complete refund to the receiver on hyperevm
            /// @dev try...catch to safeguard against possible breaking hyperliquid pre-compile changes
            try this.handleTransfersToHyperCore{ value: msg.value }(_to, amountLD) {} catch {
                _refundToHyperEvm(_to, amountLD);
            }
        } catch {
            SendParam memory refundSendParam;
            refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
            refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
            refundSendParam.amountLD = amountLD;

            failedMessages[_guid] = FailedMessage({ refundSendParam: refundSendParam, msgValue: msg.value });
            emit FailedMessageDecode(_guid, refundSendParam.to, msg.value, composeMsgEncoded);
        }
    }

    /**
     * @notice Decodes the compose message to extract minMsgValue and receiver address
     * @param _composeMessage The encoded compose message
     * @return minMsgValue - The minimum message value required
     * @return to - The receiver address
     */
    function decodeMessage(bytes calldata _composeMessage) external pure returns (uint256 minMsgValue, address to) {
        if (_composeMessage.length != VALID_COMPOSE_MSG_LEN) revert ComposeMsgLengthNot64Bytes(_composeMessage.length);

        (minMsgValue, to) = abi.decode(_composeMessage, (uint256, address));
    }

    /**
     * @dev Transfers native and erc20 to HyperCore via asset bridge, then to receiver via CoreWriter. Returns dust to HyperEVM.
     * @dev If either fails then we complete refund the user on HyperEVM
     * @dev Default behavior checks if the user is activated on HyperCore in ERC20 transfer, if not then revert this call
     * @dev If the user requests for more funds than the asset bridge's balance we revert
     */
    function handleTransfersToHyperCore(address _to, uint256 _amountLD) external payable {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        /// @dev Move ERC20 tokens into hyper core.
        _transferERC20ToHyperCore(_to, _amountLD);

        /// @dev Move native funds into hyper core.
        if (msg.value > 0) _transferNativeToHyperCore(_to);
    }

    /**
     * @notice Transfers ERC20 tokens to HyperCore
     * @notice Checks if the receiver's address is activated on HyperCore
     * @notice If the user requests for more funds than the asset bridge's balance we revert
     * @param _to The address to receive tokens on HyperCore
     * @param _amountLD The amount of tokens to transfer in LayerZero decimals
     */
    function _transferERC20ToHyperCore(address _to, uint256 _amountLD) internal virtual {
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(
            ERC20_CORE_INDEX_ID,
            ERC20_DECIMAL_DIFF,
            ERC20_ASSET_BRIDGE,
            _amountLD
        );

        /// @dev Moving tokens to asset bridge credits the coreAccount of composer with the tokens.
        /// @dev The write call then moves coreSpot tokens from the composer to receiver
        if (amounts.evm != 0) {
            /// @dev This reverts if the user is not activated in the default case, else it simply returns `amounts.core`
            uint64 coreAmount = _getFinalCoreAmount(_to, amounts.core);

            // Transfer the tokens to the composer's address on HyperCore
            IERC20(ERC20).safeTransfer(ERC20_ASSET_BRIDGE, amounts.evm);

            _submitCoreWriterTransfer(_to, ERC20_CORE_INDEX_ID, coreAmount);
        }
    }

    /**
     * @notice Transfers native HYPE tokens to HyperCore
     * @notice If the user requests for more funds than the asset bridge's balance we revert
     * @param _to The address to receive tokens on HyperCore
     */
    function _transferNativeToHyperCore(address _to) internal virtual {
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(
            NATIVE_CORE_INDEX_ID,
            NATIVE_DECIMAL_DIFF,
            NATIVE_ASSET_BRIDGE,
            msg.value
        );

        if (amounts.evm != 0) {
            // Transfer the HYPE tokens to the composer's address on HyperCore
            (bool success, ) = payable(NATIVE_ASSET_BRIDGE).call{ value: amounts.evm }("");
            if (!success) revert NativeTransferFailed(amounts.evm);

            _submitCoreWriterTransfer(_to, NATIVE_CORE_INDEX_ID, amounts.core);
        }
    }

    /**
     * @notice Checks if the receiver's address is activated on HyperCore
     * @notice To be overriden on FeeToken or other implementations since this can be used to activate tokens
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
     * @notice External function to quote the conversion of evm tokens to hypercore tokens
     * @param _coreIndexId The core index id of the token to transfer
     * @param _decimalDiff The decimal difference of evmDecimals - coreDecimals
     * @param _bridgeAddress The asset bridge address of the token to transfer
     * @param _amountLD The number of tokens that the composer received (pre-dusted) that we are trying to send
     * @return IHyperAssetAmount - The amount of tokens to send to HyperCore (scaled on evm), dust (to be refunded), and the swap amount (of the tokens scaled on hypercore)
     */
    function quoteHyperCoreAmount(
        uint64 _coreIndexId,
        int8 _decimalDiff,
        address _bridgeAddress,
        uint256 _amountLD
    ) public view returns (IHyperAssetAmount memory) {
        uint64 bridgeBalance = spotBalance(_bridgeAddress, _coreIndexId).total;
        return _amountLD.into_hyperAssetAmount(bridgeBalance, _decimalDiff);
    }

    /**
     * @notice Handles refunds to HyperEVM for both HYPE and ERC20 tokens to the initial recipient
     * @param _refundAddress The address to refund tokens to
     * @param _amountLD The amount of ERC20 tokens to refund
     */
    function _refundToHyperEvm(address _refundAddress, uint256 _amountLD) internal virtual {
        if (msg.value != 0) {
            (bool success1, ) = _refundAddress.call{ value: msg.value }("");
            if (!success1) {
                (bool success2, ) = tx.origin.call{ value: msg.value }("");
                if (!success2) revert NativeTransferFailed(msg.value);
            }
        }

        if (_amountLD != 0) IERC20(ERC20).safeTransfer(_refundAddress, _amountLD);
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

        emit RefundSuccessful(_guid);
    }

    /**
     * @dev Minimum gas to be supplied to the composer contract for execution to prevent Out of Gas.
     * todo Profile against mainnet
     * @return The minimum gas amount
     */
    function MIN_GAS() public virtual returns (uint256) {
        return 150_000;
    }

    receive() external payable {}
}
