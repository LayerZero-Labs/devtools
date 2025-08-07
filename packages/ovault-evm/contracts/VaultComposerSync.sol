// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC4626, IERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IVaultComposerSync } from "./interfaces/IVaultComposerSync.sol";

/**
 * @title VaultComposerSync - Synchronous Vault Composer
 * @author LayerZero Labs (@shankars99, @TRileySchwarz)
 * @notice This contract is a composer that allows deposits and redemptions operations against a
 *         synchronous vault across different chains using LayerZero's OFT protocol.
 * @dev The contract is designed to handle deposits and redemptions of vault shares and assets,
 *      ensuring that the share and asset tokens are correctly managed and transferred across chains.
 *      It also includes slippage protection and refund mechanisms for failed transactions.
 * @dev Default refunds are enabled to EOA addresses only on the source.
        Custom refunds to contracts can be implemented by overriding the _refund function.
 * @dev Default vault interface is IERC4626 - [ERC4626](https://eips.ethereum.org/EIPS/eip-4626) compliant vaults.
 *      Custom vaults can be implemented by overriding the _deposit and _redeem functions.
 */
contract VaultComposerSync is IVaultComposerSync, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    /// @dev Must be a synchronous vault - NO 2-step redemptions/deposit windows
    IERC4626 public immutable VAULT;

    address public immutable ASSET_OFT;
    address public immutable ASSET_ERC20;
    address public immutable SHARE_OFT;
    address public immutable SHARE_ERC20;

    address public immutable ENDPOINT;
    uint32 public immutable VAULT_EID;

    /**
     * @notice Initializes the VaultComposerSync contract with vault and OFT token addresses
     * @param _vault The address of the ERC4626 vault contract
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _shareOFT The address of the share OFT contract (must be an adapter)
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Asset token must match the vault's underlying asset
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(address _vault, address _assetOFT, address _shareOFT) {
        VAULT = IERC4626(_vault);

        ASSET_OFT = _assetOFT;
        ASSET_ERC20 = IOFT(ASSET_OFT).token();
        SHARE_OFT = _shareOFT;
        SHARE_ERC20 = IOFT(SHARE_OFT).token();

        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());
        VAULT_EID = ILayerZeroEndpointV2(ENDPOINT).eid();

        if (SHARE_ERC20 != address(VAULT)) {
            revert ShareTokenNotVault(SHARE_ERC20, address(VAULT));
        }

        if (ASSET_ERC20 != address(VAULT.asset())) {
            revert AssetTokenNotVaultAsset(ASSET_ERC20, address(VAULT.asset()));
        }

        /// @dev ShareOFT must be an OFT adapter. We can infer this by checking 'approvalRequired()'.
        /// @dev burn() on tokens when a user sends changes totalSupply() which the asset:share ratio depends on.
        if (!IOFT(SHARE_OFT).approvalRequired()) revert ShareOFTNotAdapter(SHARE_OFT);

        /// @dev Approve the vault to spend the asset tokens held by this contract
        IERC20(ASSET_ERC20).approve(_vault, type(uint256).max);
        /// @dev Approving the vault for the share erc20 is not required when the vault is the share erc20
        // IERC20(SHARE_ERC20).approve(_vault, type(uint256).max);

        /// @dev Approve the share adapter with the share tokens held by this contract
        IERC20(SHARE_ERC20).approve(_shareOFT, type(uint256).max);
        /// @dev If the asset OFT is an adapter, approve it as well
        if (IOFT(_assetOFT).approvalRequired()) IERC20(ASSET_ERC20).approve(_assetOFT, type(uint256).max);
    }

    /**
     * @notice Handles LayerZero compose operations for vault transactions with automatic refund functionality
     * @dev This composer is designed to handle refunds to an EOA address and not a contract
     * @dev Any revert in handleCompose() causes a refund back to the src EXCEPT for InsufficientMsgValue
     * @param _composeSender The OFT contract address used for refunds, must be either ASSET_OFT or SHARE_OFT
     * @param _guid LayerZero's unique tx id (created on the source tx)
     * @param _message Decomposable bytes object into [composeHeader][composeMessage]
     */
    function lzCompose(
        address _composeSender, // The OFT used on refund, also the vaultIn token.
        bytes32 _guid,
        bytes calldata _message, // expected to contain a composeMessage = abi.encode(SendParam hopSendParam,uint256 minMsgValue)
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        if (msg.sender != ENDPOINT) revert OnlyEndpoint(msg.sender);
        if (_composeSender != ASSET_OFT && _composeSender != SHARE_OFT) revert OnlyValidComposeCaller(_composeSender);

        bytes32 composeFrom = _message.composeFrom();
        uint256 amount = _message.amountLD();
        bytes memory composeMsg = _message.composeMsg();

        /// @dev try...catch to handle the compose operation. if it fails we refund the user
        try this.handleCompose{ value: msg.value }(_composeSender, composeFrom, composeMsg, amount) {
            emit Sent(_guid);
        } catch (bytes memory _err) {
            /// @dev A revert where the msg.value passed is lower than the min expected msg.value is handled separately
            /// This is because it is possible to re-trigger from the endpoint the compose operation with the right msg.value
            if (bytes4(_err) == InsufficientMsgValue.selector) {
                assembly {
                    revert(add(32, _err), mload(_err))
                }
            }

            _refund(_composeSender, _message, amount, tx.origin);
            emit Refunded(_guid);
        }
    }

    /**
     * @notice Handles the compose operation for OFT (Omnichain Fungible Token) transactions
     * @dev This function can only be called by the contract itself (self-call restriction)
     *      Decodes the compose message to extract SendParam and minimum message value
     *      Routes to either deposit or redeem flow based on the input OFT token type
     * @param _oftIn The OFT token whose funds have been received in the lzReceive associated with this lzTx
     * @param _composeFrom The bytes32 identifier of the compose sender
     * @param _composeMsg The encoded message containing SendParam and minMsgValue
     * @param _amount The amount of tokens received in the lzReceive associated with this lzTx
     */
    function handleCompose(
        address _oftIn,
        bytes32 _composeFrom,
        bytes memory _composeMsg,
        uint256 _amount
    ) external payable {
        /// @dev Can only be called by self
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        /// @dev SendParam defines how the composer will handle the user's funds
        /// @dev The minMsgValue is the minimum amount of msg.value that must be sent, failing to do so will revert and the transaction will be retained in the endpoint for future retries
        (SendParam memory sendParam, uint256 minMsgValue) = abi.decode(_composeMsg, (SendParam, uint256));
        if (msg.value < minMsgValue) revert InsufficientMsgValue(minMsgValue, msg.value);

        if (_oftIn == ASSET_OFT) {
            _depositAndSend(_composeFrom, _amount, sendParam, tx.origin);
        } else {
            _redeemAndSend(_composeFrom, _amount, sendParam, tx.origin);
        }
    }

    /**
     * @notice Deposits ERC20 assets from the caller into the vault and sends them to the recipient
     * @param _assetAmount The number of ERC20 tokens to deposit and send
     * @param _sendParam Parameters on how to send the shares to the recipient
     * @param _refundAddress Address to receive excess `msg.value`
     */
    function depositAndSend(
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(ASSET_ERC20).safeTransferFrom(msg.sender, address(this), _assetAmount);
        _depositAndSend(OFTComposeMsgCodec.addressToBytes32(msg.sender), _assetAmount, _sendParam, _refundAddress);
    }

    /**
     * @dev Internal function that deposits assets and sends shares to another chain
     * @param _depositor The depositor (bytes32 format to account for non-evm addresses)
     * @param _assetAmount The number of assets to deposit
     * @param _sendParam Parameter that defines how to send the shares
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first deposits the assets to mint shares, validates the shares meet minimum slippage requirements,
     *         then sends the minted shares cross-chain using the OFT (Omnichain Fungible Token) protocol
     * @notice The _sendParam.amountLD is updated to the actual share amount minted, and minAmountLD is reset to 0 for the send operation
     */
    function _depositAndSend(
        bytes32 _depositor,
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 shareAmount = _deposit(_depositor, _assetAmount);
        _assertSlippage(shareAmount, _sendParam.minAmountLD);

        _sendParam.amountLD = shareAmount;
        _sendParam.minAmountLD = 0;

        _send(SHARE_OFT, _sendParam, _refundAddress);
    }

    /**
     * @dev Internal function to deposit assets into the vault
     * @param _assetAmount The number of assets to deposit into the vault
     * @return shareAmount The number of shares received from the vault deposit
     * @notice This function is expected to be overridden by the inheriting contract to implement custom/nonERC4626 deposit logic
     */
    function _deposit(bytes32 /*_depositor*/, uint256 _assetAmount) internal virtual returns (uint256 shareAmount) {
        shareAmount = VAULT.deposit(_assetAmount, address(this));
    }

    /**
     * @notice Redeems vault shares and sends the resulting assets to the user
     * @param _shareAmount The number of vault shares to redeem
     * @param _sendParam Parameter that defines how to send the assets
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function redeemAndSend(
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(SHARE_ERC20).safeTransferFrom(msg.sender, address(this), _shareAmount);
        _redeemAndSend(OFTComposeMsgCodec.addressToBytes32(msg.sender), _shareAmount, _sendParam, _refundAddress);
    }

    /**
     * @dev Internal function that redeems shares for assets and sends them cross-chain
     * @param _redeemer The address of the redeemer in bytes32 format
     * @param _shareAmount The number of shares to redeem
     * @param _sendParam Parameter that defines how to send the assets
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first redeems the specified share amount for the underlying asset,
     *         validates the received amount against slippage protection, then initiates a cross-chain
     *         transfer of the redeemed assets using the OFT (Omnichain Fungible Token) protocol
     * @notice The minAmountLD in _sendParam is reset to 0 after slippage validation since the
     *         actual amount has already been verified
     */
    function _redeemAndSend(
        bytes32 _redeemer,
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 assetAmount = _redeem(_redeemer, _shareAmount);
        _assertSlippage(assetAmount, _sendParam.minAmountLD);

        _sendParam.amountLD = assetAmount;
        _sendParam.minAmountLD = 0;

        _send(ASSET_OFT, _sendParam, _refundAddress);
    }

    /**
     * @dev Internal function to redeem shares from the vault
     * @param _shareAmount The number of shares to redeem from the vault
     * @return assetAmount The number of assets received from the vault redemption
     * @notice This function is expected to be overridden by the inheriting contract to implement custom/nonERC4626 redemption logic
     */
    function _redeem(bytes32 /*_redeemer*/, uint256 _shareAmount) internal virtual returns (uint256 assetAmount) {
        assetAmount = VAULT.redeem(_shareAmount, address(this), address(this));
    }

    /**
     * @param _amountLD The amount of tokens to send
     * @param _minAmountLD The minimum amount of tokens that must be sent to avoid slippage
     * @notice This function checks if the amount sent is less than the minimum amount
     *         If it is, it reverts with SlippageExceeded error
     * @notice This function can be overridden to implement custom slippage logic
     */
    function _assertSlippage(uint256 _amountLD, uint256 _minAmountLD) internal view virtual {
        if (_amountLD < _minAmountLD) revert SlippageExceeded(_amountLD, _minAmountLD);
    }

    /**
     * @notice Quotes the send operation for the given OFT and SendParam
     * @dev Revert on slippage will be thrown by the OFT and not _assertSlippage
     * @param _from The "sender address" used for the quote
     * @param _targetOFT The OFT contract address to quote
     * @param _vaultInAmount The amount of tokens to send to the vault
     * @param _sendParam The parameters for the send operation
     * @return MessagingFee The estimated fee for the send operation
     * @dev This function can be overridden to implement custom quoting logic
     */
    function quoteSend(
        address _from,
        address _targetOFT,
        uint256 _vaultInAmount,
        SendParam memory _sendParam
    ) external view virtual returns (MessagingFee memory) {
        /// @dev When quoting the asset OFT, the function input is shares and the SendParam.amountLD into quoteSend() should be assets (and vice versa)

        if (_targetOFT == ASSET_OFT) {
            uint256 maxRedeem = VAULT.maxRedeem(_from);
            if (_vaultInAmount > maxRedeem) {
                revert ERC4626.ERC4626ExceededMaxRedeem(_from, _vaultInAmount, maxRedeem);
            }

            _sendParam.amountLD = VAULT.previewRedeem(_vaultInAmount);
        } else {
            uint256 maxDeposit = VAULT.maxDeposit(_from);
            if (_vaultInAmount > maxDeposit) {
                revert ERC4626.ERC4626ExceededMaxDeposit(_from, _vaultInAmount, maxDeposit);
            }

            _sendParam.amountLD = VAULT.previewDeposit(_vaultInAmount);
        }
        return IOFT(_targetOFT).quoteSend(_sendParam, false);
    }

    /**
     * @dev Internal function that handles token transfer to the recipient
     * @dev If the destination eid is the same as the current eid, it transfers the tokens directly to the recipient
     * @dev If the destination eid is different, it sends a LayerZero cross-chain transaction
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function _send(address _oft, SendParam memory _sendParam, address _refundAddress) internal {
        if (_sendParam.dstEid == VAULT_EID) {
            /// @dev Can do this because _oft is validated before this function is called
            address erc20 = _oft == ASSET_OFT ? ASSET_ERC20 : SHARE_ERC20;

            if (msg.value > 0) revert NoMsgValueExpected();
            IERC20(erc20).safeTransfer(_sendParam.to.bytes32ToAddress(), _sendParam.amountLD);
        } else {
            // crosschain send
            IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), _refundAddress);
        }
    }

    /**
     * @dev Internal function to refund input tokens to sender on source during a failed transaction
     * @param _oft The OFT contract address used for refunding
     * @param _message The original message that was sent
     * @param _amount The amount of tokens to refund
     * @param _refundAddress Address to receive the refund
     */
    function _refund(address _oft, bytes calldata _message, uint256 _amount, address _refundAddress) internal virtual {
        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        IOFT(_oft).send{ value: msg.value }(refundSendParam, MessagingFee(msg.value, 0), _refundAddress);
    }

    receive() external payable {}
}
