// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidReadPrecompile } from "./interfaces/IHyperLiquidReadPrecompile.sol";
import { IHyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount, FailedMessage } from "./interfaces/IHyperLiquidComposerCore.sol";

import { ICoreWriter } from "./interfaces/ICoreWriter.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";

import { HyperLiquidConstants } from "./HyperLiquidConstants.sol";

/**
 * @title Hyperliquid Composer Core
 * @notice Core functionality for Hyperliquid composer operations
 * @dev Base contract providing core functionality for transferring tokens between HyperEVM and HyperCore
 */
contract HyperLiquidComposerCore is HyperLiquidConstants, IHyperLiquidComposerCore {
    using SafeERC20 for IERC20;

    using HyperLiquidComposerCodec for bytes32;
    using HyperLiquidComposerCodec for bytes;
    using HyperLiquidComposerCodec for uint256;

    uint256 public constant MIN_GAS = 150_000;
    uint256 public constant NATIVE_TRANSFER_GAS = 2_300;

    uint256 public constant VALID_COMPOSE_MSG_LEN = 64; /// abi.encode(uint256,address) = 32+32

    mapping(uint256 => uint64) public hypeIndexByChainId;
    mapping(bytes32 => FailedMessage) public failedMessages;

    address public immutable ENDPOINT;
    address public immutable OFT;
    address public immutable TOKEN;

    address public immutable REFUND_ADDRESS;

    IHyperAsset public oftAsset;
    IHyperAsset public hypeAsset;

    /**
     * @notice Constructor for HyperLiquidComposerCore
     * @param _oft The OFT contract address
     */
    constructor(address _oft) {
        hypeIndexByChainId[HYPE_CHAIN_ID_TESTNET] = HYPE_INDEX_TESTNET;
        hypeIndexByChainId[HYPE_CHAIN_ID_MAINNET] = HYPE_INDEX_MAINNET;

        if (_oft == address(0)) revert InvalidOFTAddress();

        ENDPOINT = address(IOAppCore(_oft).endpoint());

        OFT = _oft;
        TOKEN = IOFT(OFT).token();

        uint64 hypeIndex = hypeIndexByChainId[block.chainid];
        if (hypeIndex == 0) revert UnsupportedChainId(block.chainid);

        /// @dev HYPE system contract address for Core<->EVM transfers
        hypeAsset = IHyperAsset({
            decimalDiff: HYPE_DECIMAL_DIFF,
            coreIndexId: hypeIndex,
            assetBridgeAddress: HYPE_SYSTEM_CONTRACT
        });
    }

    /**
     * @notice External function to quote the conversion of evm tokens to hypercore tokens
     * @param _amount The amount of tokens to send
     * @param _isOFT Whether the amount is an OFT amount or a HYPE amount
     * @return IHyperAssetAmount - The amount of tokens to send to HyperCore (scaled on evm), dust (to be refunded), and the swap amount (of the tokens scaled on hypercore)
     */
    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) public view returns (IHyperAssetAmount memory) {
        IHyperAsset memory asset = _isOFT ? oftAsset : hypeAsset;
        uint64 coreBalance = _balanceOfHyperCore(asset.assetBridgeAddress, asset.coreIndexId);
        return _amount.into_hyperAssetAmount(coreBalance, asset);
    }

    /**
     * @notice External function to read the balance of the user in the hypercore
     * @param _user The address of the user
     * @param _tokenId The token id of the hypercore
     * @return The balance of the user in the hypercore
     */
    function balanceOfHyperCore(address _user, uint64 _tokenId) external view returns (uint64) {
        return _balanceOfHyperCore(_user, _tokenId);
    }

    /**
     * @notice Internal function to read the balance of the user in the hypercore
     * @param _user The address of the user
     * @param _tokenId The token id of the hypercore
     * @return The balance of the user in the hypercore
     */
    function _balanceOfHyperCore(address _user, uint64 _tokenId) internal view returns (uint64) {
        bool success;
        bytes memory result;
        (success, result) = HLP_PRECOMPILE_READ_SPOT_BALANCE.staticcall(abi.encode(_user, _tokenId));
        if (!success) revert SpotBalanceReadFailed(_user, _tokenId);

        return abi.decode(result, (IHyperLiquidReadPrecompile.SpotBalance)).total;
    }

    /**
     * @notice Handles refunds on HyperEVM for both HYPE and ERC20 tokens
     * @dev Since this is an external function - the msg.value can be different to the msg.value sent to the lzCompose function by tx.origin
     * @dev It is different in the case of a partial refund where the call is:
     * @dev `this.refundNativeTokens{ value: amounts.dust }(_receiver)`
     * @dev In this case, the msg.value is the amount of the dust and not the msg.value sent to the lzCompose function by tx.origin
     * @param _refundAddress The address to refund tokens to
     * @param _hypeAmt The amount of HYPE tokens to refund
     * @param _erc20Amt The amount of ERC20 tokens to refund
     */
    function _hyperevmRefund(address _refundAddress, uint256 _hypeAmt, uint256 _erc20Amt) internal {
        if (_hypeAmt > 0) {
            (bool success1, ) = _refundAddress.call{ value: _hypeAmt, gas: NATIVE_TRANSFER_GAS }("");
            if (!success1) {
                (bool success2, ) = tx.origin.call{ value: _hypeAmt }("");
                if (!success2) revert NativeTransferFailed(tx.origin, _hypeAmt);
            }
        }

        if (_erc20Amt > 0) {
            IERC20(TOKEN).safeTransfer(_refundAddress, _erc20Amt);
        }
    }

    /**
     * @notice Refunds failed messages to the source chain
     * @param _guid The GUID of the failed message to refund
     */
    function refundToSrc(bytes32 _guid) external payable virtual {
        FailedMessage memory failedMessage = failedMessages[_guid];
        if (failedMessage.refundSendParam.dstEid == 0) {
            revert FailedMessageNotFound(_guid);
        }
        delete failedMessages[_guid];

        uint256 totalMsgValue = failedMessage.msgValue + msg.value;

        /// @dev Refunds the OFT contract with the refundSendParam
        IOFT(OFT).send{ value: totalMsgValue }(
            failedMessage.refundSendParam,
            MessagingFee(totalMsgValue, 0),
            REFUND_ADDRESS
        );

        /// @dev Emits the RefundSuccessful event
        emit RefundSuccessful(_guid);
    }

    /**
     * @notice Transfers tokens on HyperCore using the CoreWriter precompile
     * @param _to The address to receive tokens on HyperCore
     * @param _coreIndex The core index of the token
     * @param _coreAmount The amount to transfer on HyperCore
     */
    function _submitCoreWriterTransfer(address _to, uint64 _coreIndex, uint64 _coreAmount) internal virtual {
        bytes memory action = abi.encode(_to, _coreIndex, _coreAmount);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        /// Transfers HYPE tokens from the composer address on HyperCore to the _to via the SpotSend precompile
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
    }
}
