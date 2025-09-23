// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IVaultComposerSyncHydra, IStargateWithPath } from "./interfaces/IVaultComposerSyncHydra.sol";
import { VaultComposerSync } from "./VaultComposerSync.sol";

/**
 * @title VaultComposerSyncHydra - Synchronous Vault Composer with Stargate Hydra
 * @author LayerZero Labs (@shankars99)
 * @notice Enables vault operations across chains with Bridge+Swap fallback for Stargate Pool failures
 * @dev Extends VaultComposerSync with Hydra-specific error handling:
 *      - Pool destinations: Bridge+Swap pattern on send failures (liquidity/slippage issues)
 *      - OFT destinations: Revert for LayerZero retry mechanism (config/gas issues)
 * @dev Uses hubRecoveryAddress for Pool failure recovery, falling back to tx.origin
 * @dev Compatible with ERC4626 vaults and requires Share OFT to be an adapter
 */
contract VaultComposerSyncHydra is VaultComposerSync, IVaultComposerSyncHydra {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    /// @dev Hydra OFTs have unlimited credit
    uint64 public constant UNLIMITED_CREDIT = type(uint64).max;

    /**
     * @notice Initializes the VaultComposerSyncHydra contract with vault and OFT token addresses
     * @param _vault The address of the ERC4626 vault contract
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _shareOFT The address of the share OFT contract (must be an adapter)
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Asset token must match the vault's underlying asset
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(address _vault, address _assetOFT, address _shareOFT) VaultComposerSync(_vault, _assetOFT, _shareOFT) {}

    /**
     * @notice Handles the compose operation for OFT (Omnichain Fungible Token) transactions
     * @dev This function can only be called by the contract itself (self-call restriction)
     *      Decodes the compose message to extract SendParam, hubRecoveryAddress, and minMsgValue
     *      Routes to either deposit or redeem flow based on the input OFT token type
     * @param _oftIn The OFT token whose funds have been received in the lzReceive associated with this lzTx
     * @param _composeFrom The bytes32 identifier of the compose sender
     * @param _composeMsg The encoded message containing SendParam, hubRecoveryAddress, and minMsgValue
     * @param _amount The amount of tokens received in the lzReceive associated with this lzTx
     */
    function handleCompose(
        address _oftIn,
        bytes32 _composeFrom,
        bytes memory _composeMsg,
        uint256 _amount
    ) external payable override {
        /// @dev Can only be called by self
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        /// @dev SendParam: defines how the composer will handle the user's funds
        /// @dev hubRecoveryAddress: EVM address to receive tokens on Pool send failures
        /// @dev minMsgValue: minimum msg.value required to prevent endpoint retry
        (SendParam memory sendParam, address hubRecoveryAddress, uint256 minMsgValue) = abi.decode(
            _composeMsg,
            (SendParam, address, uint256)
        );
        if (msg.value < minMsgValue) revert InsufficientMsgValue(minMsgValue, msg.value);

        /// @dev Always trigger Taxi mode
        sendParam.oftCmd = hex"";

        if (_oftIn == ASSET_OFT) {
            _depositAndSend(_composeFrom, _amount, sendParam, hubRecoveryAddress);
        } else {
            _redeemAndSend(_composeFrom, _amount, sendParam, hubRecoveryAddress);
        }
    }

    /**
     * @dev Internal function that handles token transfer to the recipient
     * @dev If the destination eid is the same as the current eid, it transfers the tokens directly to the recipient
     * @dev If the destination eid is different, it sends a LayerZero cross-chain transaction
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function _send(address _oft, SendParam memory _sendParam, address _refundAddress) internal override {
        if (_sendParam.dstEid == VAULT_EID) {
            /// @dev Can do this because _oft is validated before this function is called
            address erc20 = _oft == ASSET_OFT ? ASSET_ERC20 : SHARE_ERC20;

            if (msg.value > 0) revert NoMsgValueExpected();
            IERC20(erc20).safeTransfer(_sendParam.to.bytes32ToAddress(), _sendParam.amountLD);
        } else {
            _sendOrFallbackToHub(_oft, _sendParam, _refundAddress);
        }
    }

    /**
     * @dev Internal function to refund input tokens to sender on source during a failed transaction
     * @param _oft The OFT contract address used for refunding
     * @param _message The original message that was sent
     * @param _amount The amount of tokens to refund
     * @param _refundAddress Address to receive the refund
     */
    function _refund(
        address _oft,
        bytes calldata _message,
        uint256 _amount,
        address _refundAddress
    ) internal virtual override {
        /// @dev Extract refund details from _message header (always present from lzReceive)
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        _sendOrFallbackToHub(_oft, refundSendParam, _refundAddress);
    }

    /**
     * @dev Send tokens via OFT with Stargate Hydra-specific error handling
     * @dev Bridge+Swap pattern for Pool failures, retry mechanism for OFT failures
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive tokens and native on Pool failure
     */
    function _sendOrFallbackToHub(address _oft, SendParam memory _sendParam, address _refundAddress) internal {
        try IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), _refundAddress) {} catch {
            /// @dev For Pool destinations: transfer directly to user on failure (Bridge+Swap pattern)
            /// @dev For OFT destinations or Share tokens: revert to allow LayerZero retry mechanism
            if (_oft == SHARE_OFT || _isOFTPath(_sendParam.dstEid)) revert OFTSendFailed();

            /// @dev Transfer the asset to the hub recovery address
            IERC20(ASSET_ERC20).safeTransfer(_refundAddress, _sendParam.amountLD);

            if (msg.value == 0) return;

            /// @dev Try sending native to hub recovery, fallback to tx.origin
            (bool sentToHub, ) = _refundAddress.call{ value: msg.value }("");
            if (!sentToHub) {
                (bool sentToOrigin, ) = tx.origin.call{ value: msg.value }("");
                /// @dev If this fails then the user should call Endpoint.lzCompose() from an address that can receive native
                if (!sentToOrigin) revert NativeTransferFailed(msg.value);
            }
        }
    }

    /**
     * @dev Internal function to check if a destination endpoint uses OFT path (unlimited credit)
     * @param _dstEid The destination endpoint ID to check
     * @return Whether the destination path has unlimited credit (OFT) or limited credit (Pool)
     */
    function _isOFTPath(uint32 _dstEid) internal view returns (bool) {
        return IStargateWithPath(ASSET_OFT).paths(_dstEid).credit == UNLIMITED_CREDIT;
    }
}
