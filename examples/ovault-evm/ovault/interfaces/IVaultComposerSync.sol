// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {IOFT, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title IVaultComposerSync
 * @notice Interface for the VaultComposerSync contract
 * @dev Orchestrates cross-chain ERC4626 vault operations for Staked Token
 */
interface IVaultComposerSync {
    /* ========== STRUCTS ========== */

    /**
     * @notice Parameters for deposit and send operation
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive shares on destination chain
     * @param dstEid Destination endpoint ID
     * @param minShares Minimum shares to receive (slippage protection)
     * @param extraOptions Additional LayerZero options
     */
    struct DepositAndSendParams {
        uint256 assets;
        address receiver;
        uint32 dstEid;
        uint256 minShares;
        bytes extraOptions;
    }

    /**
     * @notice Parameters for redeem and send operation
     * @param shares Amount of shares to redeem
     * @param receiver Address to receive assets on destination chain
     * @param dstEid Destination endpoint ID
     * @param minAssets Minimum assets to receive (slippage protection)
     * @param extraOptions Additional LayerZero options
     */
    struct RedeemAndSendParams {
        uint256 shares;
        address receiver;
        uint32 dstEid;
        uint256 minAssets;
        bytes extraOptions;
    }

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when assets are deposited and shares sent cross-chain
     * @param sender Address that initiated the deposit
     * @param receiver Address that will receive shares
     * @param assets Amount of assets deposited
     * @param shares Amount of shares minted
     * @param dstEid Destination endpoint ID
     * @param guid LayerZero message GUID
     */
    event DepositAndSend(
        address indexed sender,
        address indexed receiver,
        uint256 assets,
        uint256 shares,
        uint32 indexed dstEid,
        bytes32 guid
    );

    /**
     * @notice Emitted when shares are redeemed and assets sent cross-chain
     * @param sender Address that initiated the redeem
     * @param receiver Address that will receive assets
     * @param shares Amount of shares redeemed
     * @param assets Amount of assets received
     * @param dstEid Destination endpoint ID
     * @param guid LayerZero message GUID
     */
    event RedeemAndSend(
        address indexed sender,
        address indexed receiver,
        uint256 shares,
        uint256 assets,
        uint32 indexed dstEid,
        bytes32 guid
    );

    /**
     * @notice Emitted when a refund is triggered due to failed operation
     * @param receiver Address that received the refund
     * @param amount Amount refunded
     * @param isAsset True if refunding assets, false if refunding shares
     */
    event Refund(address indexed receiver, uint256 amount, bool isAsset);

    /* ========== ERRORS ========== */

    /// @notice Thrown when slippage protection is triggered
    error SlippageExceeded(uint256 actualAmount, uint256 minAmount);

    /// @notice Thrown when an invalid endpoint ID is provided
    error InvalidEndpointId(uint32 eid);

    /// @notice Thrown when an invalid receiver address is provided
    error InvalidReceiver();

    /// @notice Thrown when an invalid amount is provided
    error InvalidAmount();

    /// @notice Thrown when caller is not authorized
    error Unauthorized();

    /// @notice Thrown when the operation is not allowed
    error OperationNotAllowed();

    /* ========== FUNCTIONS ========== */

    /**
     * @notice Deposit assets into vault and send shares to destination chain
     * @param params Deposit and send parameters
     * @param fee LayerZero messaging fee
     * @param refundAddress Address to receive refunds
     * @return guid LayerZero message GUID
     */
    function depositAndSend(DepositAndSendParams calldata params, MessagingFee calldata fee, address refundAddress)
        external
        payable
        returns (bytes32 guid);

    /**
     * @notice Redeem shares from vault and send assets to destination chain
     * @param params Redeem and send parameters
     * @param fee LayerZero messaging fee
     * @param refundAddress Address to receive refunds
     * @return guid LayerZero message GUID
     */
    function redeemAndSend(RedeemAndSendParams calldata params, MessagingFee calldata fee, address refundAddress)
        external
        payable
        returns (bytes32 guid);

    /**
     * @notice Quote the fee for deposit and send operation
     * @param params Deposit and send parameters
     * @param payInLzToken Whether to pay in LZ token
     * @return fee The messaging fee
     */
    function quoteDepositAndSend(DepositAndSendParams calldata params, bool payInLzToken)
        external
        view
        returns (MessagingFee memory fee);

    /**
     * @notice Quote the fee for redeem and send operation
     * @param params Redeem and send parameters
     * @param payInLzToken Whether to pay in LZ token
     * @return fee The messaging fee
     */
    function quoteRedeemAndSend(RedeemAndSendParams calldata params, bool payInLzToken)
        external
        view
        returns (MessagingFee memory fee);

    /**
     * @notice Get the vault address
     * @return The address of the Staked Token vault
     */
    function vault() external view returns (IERC4626);

    /**
     * @notice Get the asset OFT address
     * @return The address of the Token (asset OFT)
     */
    function assetOFT() external view returns (IOFT);

    /**
     * @notice Get the share OFT adapter address
     * @return The address of the ShareOFTAdapter
     */
    function shareOFTAdapter() external view returns (IOFT);
}
