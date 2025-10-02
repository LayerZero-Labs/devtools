// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IVaultComposerSyncPool } from "./interfaces/IVaultComposerSyncPool.sol";
import { IStargateWithPath } from "./interfaces/IStargateWithPath.sol";
import { VaultComposerSync } from "./VaultComposerSync.sol";

/**
 * @title Synchronous Vault Composer with Stargate Pools/Hydra as Asset and ERC20 as Share (non-native)
 * @author LayerZero Labs (@shankars99)
 * @notice Enables vault operations across chains with Bridge+Swap fallback for Stargate Pool failures
 * @dev Extends VaultComposerSync with Pool-specific error handling:
 *      - Pool destinations: Bridge+Swap pattern on send failures (liquidity/slippage issues)
 *      - OFT destinations: Revert for LayerZero retry mechanism (config/gas issues)
 * @dev Uses hubRecoveryAddress for Pool failure recovery, falling back to tx.origin
 * @dev Compatible with ERC4626 vaults and requires Share OFT to be an adapter
 */
contract VaultComposerSyncPool is VaultComposerSync, IVaultComposerSyncPool {
    using OFTComposeMsgCodec for bytes;
    using SafeERC20 for IERC20;

    /// @dev Hydra OFTs have unlimited credit
    uint64 public constant UNLIMITED_CREDIT = type(uint64).max;

    /// @dev Used to receive tokens on Pool send failures only if the compose message cannot be decoded
    address public immutable DEFAULT_RECOVERY_ADDRESS;

    /**
     * @notice Initializes the VaultComposerSyncPool contract with vault and OFT token addresses
     * @param _vault The address of the ERC4626 vault contract
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _shareOFT The address of the share OFT contract (must be an adapter)
     * @param _defaultRecoveryAddress The address to receive tokens on Pool send failures if the compose message cannot be decoded
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Asset token must match the vault's underlying asset
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT,
        address _defaultRecoveryAddress
    ) VaultComposerSync(_vault, _assetOFT, _shareOFT) {
        DEFAULT_RECOVERY_ADDRESS = _defaultRecoveryAddress;
    }

    /**
     * @notice Handles the compose operation for ShareOFTs and StargateAsset Pool/OFT
     * @dev This function can only be called by the contract itself (self-call restriction)
     *      Decodes the compose message to extract SendParam, hubRecoveryAddress, and minMsgValue
     *      Routes to either deposit or redeem flow based on the input OFT token type
     * @dev Override to decode hubRecoveryAddress from the compose message
     * @param _oftIn The OFT token whose funds have been received in the lzReceive associated with this lzTx
     * @param _composeFrom The bytes32 identifier of the compose sender
     * @param _composeMsg The encoded message containing SendParam, hubRecoveryAddress, and minMsgValue
     * @param _amount The amount of tokens received in the lzReceive associated with this lzTx
     */
    function handleCompose(
        address _oftIn,
        bytes32 _composeFrom,
        bytes calldata _composeMsg,
        uint256 _amount
    ) external payable virtual override {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        // Decode compose message parameters
        (SendParam memory sendParam, address hubRecoveryAddress, uint256 minMsgValue) = decodeComposeMsg(_composeMsg);

        // Validate minimum message value to prevent endpoint retry
        if (msg.value < minMsgValue) revert InsufficientMsgValue(minMsgValue, msg.value);

        // Route to appropriate vault operation
        if (_oftIn == ASSET_OFT) {
            _depositAndSend(_composeFrom, _amount, sendParam, hubRecoveryAddress);
        } else {
            _redeemAndSend(_composeFrom, _amount, sendParam, hubRecoveryAddress);
        }
    }

    /**
     * @dev Send tokens via OFT with Stargate Pools-specific error handling
     * @dev Bridge+Swap pattern for Pool failures, retry mechanism for OFT failures
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _fallbackRefundAddress Address to receive tokens and native on Pool failure
     */
    function _sendRemote(
        address _oft,
        SendParam memory _sendParam,
        address _fallbackRefundAddress
    ) internal virtual override {
        /// @dev Refund to tx.origin to maintain the same behavior as the parent contract
        try this.lzSend{ value: msg.value }(_oft, _sendParam, tx.origin) {} catch (bytes memory _err) {
            /// @dev For Pool destinations: transfer directly to user on failure (Bridge+Swap pattern)
            /// @dev For OFT destinations or Share tokens: revert with OFT send failure reason
            if (_isOFTPath(_oft, _sendParam.dstEid)) {
                /// @dev For OFT destinations: bubble up the original error to enable LayerZero retry
                if (_err.length > 0) {
                    assembly {
                        revert(add(32, _err), mload(_err))
                    }
                } else revert();
            }

            /// @dev Code from here is executed ONLY when the send fails and _oft is Pool
            /// @dev Transfer the asset to the hub recovery address
            IERC20(ASSET_ERC20).safeTransfer(_fallbackRefundAddress, _sendParam.amountLD);

            if (msg.value == 0) return;

            /// @dev Try sending native to hub recovery
            (bool sentToHub, ) = _fallbackRefundAddress.call{ value: msg.value }("");
            if (!sentToHub) {
                /// @dev Fallback to tx.origin since we do not want a case where users tokens are locked in the contract
                (bool sentToOrigin, ) = tx.origin.call{ value: msg.value }("");
                /// @dev If this fails then the user should call Endpoint.lzCompose() from an address that can receive native
                if (!sentToOrigin) revert NativeTransferFailed(msg.value);
            }
        }
    }

    /**
     * @dev Send tokens via OFT with Stargate Pools-specific error handling
     * @dev Bridge+Swap pattern for Pool failures, retry mechanism for OFT failures
     * @dev Can only be called by self
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive tokens and native on Pool failure
     */
    function lzSend(address _oft, SendParam memory _sendParam, address _refundAddress) external payable virtual {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        /// @dev Safe because this is the only function in VaultComposerSync that calls oft.send()
        /// @dev Always trigger Taxi mode for txs to Stargate (assets)
        if (_oft == ASSET_OFT) _sendParam.oftCmd = hex"";

        IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), _refundAddress);
    }

    /**
     * @dev Internal function to refund input tokens to sender on source during a failed transaction
     * @dev Override to handle case for DEFAULT_RECOVERY_ADDRESS
     * @param _oft The OFT contract address used for refunding
     * @param _message The original message that was sent
     * @param _amount The amount of tokens to refund
     * @param _refundAddress Address to receive tokens and native on Pool failure. Default: tx.origin replaced in try..catch
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

        /// @dev Try to decode the compose message to get the hubRecoveryAddress else use vault owned recovery address
        /// @dev Constructor set value of _refundAddress is tx.origin, set to DEFAULT_RECOVERY_ADDRESS if decode fails
        try this.decodeComposeMsg(_message.composeMsg()) returns (
            SendParam memory,
            address hubRecoveryAddress,
            uint256
        ) {
            _refundAddress = hubRecoveryAddress;
        } catch {
            _refundAddress = DEFAULT_RECOVERY_ADDRESS;
        }

        _sendRemote(_oft, refundSendParam, _refundAddress);
    }

    /**
     * @dev Internal function to check if a destination endpoint is an OFT - Hydra or LayerZero OFT
     * @param _oft The OFT contract address to use for sending
     * @param _dstEid The destination endpoint ID to check
     * @return isOFT Whether the destination path has unlimited credit (OFT) or limited credit (Pool)
     */
    function _isOFTPath(address _oft, uint32 _dstEid) internal view returns (bool isOFT) {
        if (_oft == SHARE_OFT) return true;
        return IStargateWithPath(ASSET_OFT).paths(_dstEid).credit == UNLIMITED_CREDIT;
    }

    /**
     * @dev Public function to decode the compose message or try catch
     * @param _composeMsg The encoded message containing SendParam, hubRecoveryAddress, and minMsgValue
     * @return sendParam The parameters for the send operation
     * @return hubRecoveryAddress The address to receive tokens on Pool send failures if the compose message cannot be decoded
     * @return minMsgValue The minimum msg.value required to prevent endpoint retry
     */
    function decodeComposeMsg(
        bytes calldata _composeMsg
    ) public pure returns (SendParam memory sendParam, address hubRecoveryAddress, uint256 minMsgValue) {
        (sendParam, hubRecoveryAddress, minMsgValue) = abi.decode(_composeMsg, (SendParam, address, uint256));
    }
}
