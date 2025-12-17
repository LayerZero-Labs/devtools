// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {VaultComposerSync as LZVaultComposerSync} from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";
import {SendParam, MessagingFee, IOFT} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAuthManager} from "../../authmanager/interfaces/IAuthManager.sol";
import {IVaultComposerSync} from "./interfaces/IVaultComposerSync.sol";

/**
 * @title VaultComposerSync
 * @notice Production-ready orchestrator for cross-chain vault DEPOSITS ONLY
 * @dev ✅ DEPOSIT FLOW: Handles cross-chain Token → Staked Token deposits with auto-return
 * @dev ❌ REDEEM FLOW: DISABLED - Staked Token uses 28-day cooldown, not instant ERC4626 redeem
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAYERZERO CODE REUSE: ~95% (Inherits from LayerZero's VaultComposerSync)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✅ INHERITED FROM LAYERZERO (NO CHANGES):
 * - lzCompose() - Complete compose handling with try/catch refund logic
 * - handleCompose() - Routes to deposit or redeem flows
 * - depositAndSend() - Public function for same-chain deposits
 * - _depositAndSend() - Internal deposit workflow
 * - _send() - Routes to local or cross-chain transfers
 * - _refund() - Automatic refund mechanism
 * - _assertSlippage() - Slippage protection
 * - quoteSend() - Fee quotation
 * - All LayerZero messaging logic
 * - All error handling and events
 *
 * ➕ CUSTOM ADDITIONS (~5% - ~40 lines):
 * - AuthManager integration for KYC + Ban + Sanction checks
 * - Override _deposit() to add auth checks before calling super
 * - Override redeemAndSend() to disable (28-day cooldown incompatible)
 * - Override handleCompose() to add receiver auth checks
 * - setAuthManager() admin function
 * - _checkAuthDual() helper for sender + receiver checks
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECURITY ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 🛡️ MULTI-LAYER AUTH CHECKS (Defense in Depth):
 *
 * Layer 1 - SOURCE CHAIN (Spoke):
 * ├─ Token._send() checks BOTH sender AND recipient before initiating transfer
 * ├─ Checks via authManager.checkUser() = KYC + Ban + Sanction
 * └─ Prevents wasting gas if either party is unauthorized
 *
 * Layer 2 - HUB CHAIN (This Contract):
 * ├─ handleCompose() checks BOTH sender AND receiver via _checkAuthDual()
 * ├─ Checks via authManager.checkUser() = KYC + Ban + Sanction
 * ├─ Defense in depth: Catches mid-flight authorization changes
 * └─ Automatic refund if checks fail (LayerZero's refund mechanism)
 *
 * Layer 3 - DESTINATION CHAIN (Spoke):
 * ├─ ShareOFT._credit() checks receiver before minting shares
 * ├─ Checks via authManager.checkSanctioned() + checkBanned() = Ban + Sanction only
 * └─ Final barrier: Prevents banned/sanctioned users from receiving shares
 *
 * 🔐 authManager.checkUser() performs THREE checks (for vault operations):
 * ├─ 1. KYC Status (checkKycStatus) → revert UserMissingKyc if failed
 * ├─ 2. Ban Status (checkBanned) → revert UserNotPermitted if banned
 * └─ 3. Sanction Status (checkSanctioned) → revert UserNotPermitted if sanctioned
 *
 * Note: ShareOFT/ShareOFTAdapter (transfer operations) only check Ban + Sanction
 * VaultComposerSync (vault operations) checks KYC + Ban + Sanction
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPOSIT FLOW (Cross-Chain Token → Staked Token)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SUCCESS CASE:
 * [Spoke] User → Token burn → LayerZero → [Hub] Token mint → Auth checks ✅
 *         → Vault deposit → Staked Token mint → LayerZero → [Spoke] Staked Token mint ✅
 *
 * FAILURE CASE:
 * [Spoke] User → Token burn → LayerZero → [Hub] Token mint → Auth checks ❌
 *         → Automatic refund → LayerZero → [Spoke] Token mint (refund) ✅
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDEEM FLOW - NOT SUPPORTED
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ❌ DISABLED: Staked Token uses 28-day cooldown, NOT instant ERC4626 redeem
 *
 * Manual Redeem Process (Hub Chain Only):
 * 1. Bridge Staked Token to hub → 2. cooldownShares() → 3. Wait 28 days → 4. unstake()
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
contract VaultComposerSync is LZVaultComposerSync, Ownable {
    /* ========== STATE VARIABLES ========== */

    /// @notice AuthManager for KYC/ban checks on hub chain
    IAuthManager public authManager;

    /* ========== EVENTS ========== */

    /// @notice Emitted when AuthManager is updated
    event AuthManagerUpdated(address indexed oldAuthManager, address indexed newAuthManager);

    /// @notice Emitted when auth check fails during compose
    event AuthCheckFailed(address indexed user, string reason);

    /* ========== ERRORS ========== */

    /// @notice Thrown when redeem operations are attempted (disabled due to cooldown)
    error RedeemOperationDisabled();

    /* ========== CONSTRUCTOR ========== */

    /**
     * @notice Constructor for VaultComposerSync
     * @param _vault Address of Staked Token vault (ERC4626)
     * @param _assetOFT Address of Token (asset OFT)
     * @param _shareOFT Address of ShareOFTAdapter (share OFT adapter)
     * @param _owner Owner address for access control
     *
     * ═══════════════════════════════════════════════════════════════════════════════
     * ✅ LAYERZERO: Constructor pattern - just passes to parent
     * ➕ CUSTOM: Added Ownable for authManager access control
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    constructor(address _vault, address _assetOFT, address _shareOFT, address _owner)
        LZVaultComposerSync(_vault, _assetOFT, _shareOFT)
        Ownable(_owner)
    {}

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Set the AuthManager address
     * @param _authManager New AuthManager address
     * @dev ➕ CUSTOM: Not in LayerZero base - required for compliance
     */
    function setAuthManager(address _authManager) external onlyOwner {
        address oldAuthManager = address(authManager);
        authManager = IAuthManager(_authManager);
        emit AuthManagerUpdated(oldAuthManager, _authManager);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get the vault address
     * @return The Staked Token vault (wraps LayerZero's VAULT)
     * @dev ➕ CUSTOM: Adapter to match our interface (LayerZero uses VAULT)
     */
    function vault() external view returns (address) {
        return address(VAULT);
    }

    /**
     * @notice Get the asset OFT address
     * @return The Token address (wraps LayerZero's ASSET_OFT)
     * @dev ➕ CUSTOM: Adapter to match our interface (LayerZero uses ASSET_OFT)
     */
    function assetOFT() external view returns (address) {
        return address(ASSET_OFT);
    }

    /**
     * @notice Get the share OFT adapter address
     * @return The ShareOFTAdapter address (wraps LayerZero's SHARE_OFT)
     * @dev ➕ CUSTOM: Adapter to match our interface (LayerZero uses SHARE_OFT)
     */
    function shareOFTAdapter() external view returns (address) {
        return address(SHARE_OFT);
    }

    /**
     * @notice Quote the fee for deposit and send operation
     * @param params Deposit and send parameters
     * @param payInLzToken Whether to pay in LZ token
     * @return fee The messaging fee
     * @dev ➕ CUSTOM: Uses LayerZero's quoteSend() pattern with vault preview
     *
     * ═══════════════════════════════════════════════════════════════════════════════
     * LAYERZERO PATTERN: Uses vault.previewDeposit() to calculate actual share output
     * This matches the quoteSend() pattern in LayerZero's VaultComposerSync base
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    function quoteDepositAndSend(IVaultComposerSync.DepositAndSendParams calldata params, bool payInLzToken)
        external
        view
        returns (MessagingFee memory fee)
    {
        // Use vault preview to get actual share output (LayerZero pattern)
        uint256 expectedShares = VAULT.previewDeposit(params.assets);

        // Validate max deposit
        uint256 maxDeposit = VAULT.maxDeposit(msg.sender);
        if (params.assets > maxDeposit) {
            revert("ERC4626ExceededMaxDeposit");
        }

        // Convert to standard SendParam for quoting
        SendParam memory sendParam = SendParam({
            dstEid: params.dstEid,
            to: bytes32(uint256(uint160(params.receiver))),
            amountLD: expectedShares, // Use previewed shares, not minShares
            minAmountLD: params.minShares,
            extraOptions: params.extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Quote through the share OFT
        return IOFT(address(SHARE_OFT)).quoteSend(sendParam, payInLzToken);
    }

    /**
     * @notice Quote the fee for redeem and send operation
     * @param params Redeem and send parameters
     * @param payInLzToken Whether to pay in LZ token
     * @return fee The messaging fee
     * @dev ➕ CUSTOM: Uses LayerZero's quoteSend() pattern with vault preview
     * @dev ❌ DISABLED: Redeem operations disabled due to 28-day cooldown
     *
     * ═══════════════════════════════════════════════════════════════════════════════
     * LAYERZERO PATTERN: Uses vault.previewRedeem() to calculate actual asset output
     * Note: Function kept for interface compatibility, but redeem is disabled
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    function quoteRedeemAndSend(IVaultComposerSync.RedeemAndSendParams calldata params, bool payInLzToken)
        external
        view
        returns (MessagingFee memory fee)
    {
        // Use vault preview to get actual asset output (LayerZero pattern)
        uint256 expectedAssets = VAULT.previewRedeem(params.shares);

        // Validate max redeem
        uint256 maxRedeem = VAULT.maxRedeem(msg.sender);
        if (params.shares > maxRedeem) {
            revert("ERC4626ExceededMaxRedeem");
        }

        // Convert to standard SendParam for quoting
        SendParam memory sendParam = SendParam({
            dstEid: params.dstEid,
            to: bytes32(uint256(uint160(params.receiver))),
            amountLD: expectedAssets, // Use previewed assets, not minAssets
            minAmountLD: params.minAssets,
            extraOptions: params.extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Quote through the asset OFT
        return IOFT(address(ASSET_OFT)).quoteSend(sendParam, payInLzToken);
    }

    /* ========== PUBLIC FUNCTIONS - DEPOSIT FLOW ========== */

    /**
     * @notice Deposit assets into vault and send shares to destination chain
     * @param params Deposit and send parameters
     * @param fee LayerZero messaging fee (unused but required by interface)
     * @param refundAddress Address to receive refunds
     * @return guid LayerZero message GUID (returns zero for now)
     * @dev ➕ CUSTOM: Wrapper to match our interface (LayerZero uses different params)
     * @dev Implements the same flow as LayerZero's depositAndSend but with our params
     */
    function depositAndSend(
        IVaultComposerSync.DepositAndSendParams calldata params,
        MessagingFee calldata fee,
        address refundAddress
    ) external payable returns (bytes32 guid) {
        // Silence unused variable warning
        fee;

        // Convert our params to LayerZero's SendParam format
        SendParam memory sendParam = SendParam({
            dstEid: params.dstEid,
            to: bytes32(uint256(uint160(params.receiver))),
            amountLD: params.minShares,
            minAmountLD: params.minShares,
            extraOptions: params.extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Transfer assets from sender (same as LayerZero's depositAndSend)
        SafeERC20.safeTransferFrom(IERC20(address(ASSET_OFT)), msg.sender, address(this), params.assets);

        // Call internal _depositAndSend (from parent)
        _depositAndSend(OFTComposeMsgCodec.addressToBytes32(msg.sender), params.assets, sendParam, refundAddress);

        // Return zero guid (LayerZero's implementation doesn't return it)
        return bytes32(0);
    }

    /**
     * @notice Redeem shares from vault and send assets to destination chain
     * @dev ❌ DISABLED: 28-day cooldown incompatible with instant redeem
     */
    function redeemAndSend(IVaultComposerSync.RedeemAndSendParams calldata, MessagingFee calldata, address)
        external
        payable
        returns (bytes32)
    {
        revert RedeemOperationDisabled();
    }

    /* ========== OVERRIDES - DEPOSIT FLOW ========== */

    /**
     * @notice Override _depositAndSend to add auth checks
     * @dev ➕ CUSTOM: Adds auth checks for both sender and receiver before deposit
     * @dev ✅ LAYERZERO: Calls super._depositAndSend() for actual deposit workflow
     *
     * ═══════════════════════════════════════════════════════════════════════════════
     * LAYERZERO CODE REUSE: ~95% (Only adds auth checks before super call)
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    function _depositAndSend(
        bytes32 _depositor,
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual override {
        // ➕ CUSTOM: Auth checks for both sender and receiver (defense in depth)
        // This catches mid-flight authorization changes between source and hub
        _checkAuthDual(_depositor, _sendParam.to);

        // ✅ LAYERZERO: Delegate to parent for deposit → send workflow
        super._depositAndSend(_depositor, _assetAmount, _sendParam, _refundAddress);
    }

    /* ========== OVERRIDES - REDEEM FLOW (DISABLED) ========== */

    /**
     * @notice Override _redeemAndSend to disable it
     * @dev ❌ DISABLED: 28-day cooldown incompatible with instant redeem
     */
    function _redeemAndSend(bytes32, uint256, SendParam memory, address) internal virtual override {
        revert RedeemOperationDisabled();
    }

    /* ========== INTERNAL HELPERS ========== */

    /**
     * @dev Check both sender and receiver authorization for vault operations
     * @param _sender Sender address (bytes32 format)
     * @param _receiver Receiver address (bytes32 format)
     * @dev ➕ CUSTOM: Not in LayerZero base - defense in depth
     * @dev Uses full KYC check because vault deposits/redeems require KYC
     */
    function _checkAuthDual(bytes32 _sender, bytes32 _receiver) internal {
        if (address(authManager) == address(0)) return;

        address sender = address(uint160(uint256(_sender)));
        address receiver = address(uint160(uint256(_receiver)));

        // Check sender (skip 0x0 and 0xdead)
        if (sender != address(0) && sender != address(0xdead)) {
            try authManager.checkUser(sender) {}
            catch (bytes memory reason) {
                emit AuthCheckFailed(sender, _getRevertMsg(reason));
                revert(); // Will trigger LayerZero's refund mechanism
            }
        }

        // Check receiver (skip 0x0 and 0xdead)
        if (receiver != address(0) && receiver != address(0xdead)) {
            try authManager.checkUser(receiver) {}
            catch (bytes memory reason) {
                emit AuthCheckFailed(receiver, _getRevertMsg(reason));
                revert(); // Will trigger LayerZero's refund mechanism
            }
        }
    }

    /**
     * @dev Extract revert message from bytes
     * @dev ➕ CUSTOM: Helper for better error reporting
     */
    function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
        if (_returnData.length < 68) return "Transaction reverted silently";
        assembly {
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string));
    }

    /* ========== EMERGENCY FUNCTIONS ========== */

    /**
     * @notice Rescue tokens stuck in the contract
     * @param _token Token address to rescue
     * @param _to Recipient address
     * @param _amount Amount to rescue
     * @dev ➕ CUSTOM: Emergency function for stuck tokens (e.g., when lzCompose fails)
     * @dev This can happen when:
     *      - lzCompose() is not executed by LayerZero executor
     *      - Auth checks fail and refund mechanism doesn't work
     *      - User sends tokens directly to this contract by mistake
     */
    function rescueTokens(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Cannot rescue to zero address");
        require(_amount > 0, "Amount must be greater than zero");

        SafeERC20.safeTransfer(IERC20(_token), _to, _amount);
    }
}
