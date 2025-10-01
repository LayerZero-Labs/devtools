// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IVaultComposerSyncPoolNative } from "./interfaces/IVaultComposerSyncPoolNative.sol";
import { VaultComposerSyncPool } from "./VaultComposerSyncPool.sol";
import { IWETH } from "./interfaces/IWETH.sol";

/**
 * @title Synchronous Vault Composer with Stargate NativePools/Hydra as Asset and WETH as Share
 * @author LayerZero Labs (@shankars99)
 * @notice Enables vault operations across chains with Bridge+Swap fallback for Stargate Pool failures
 * @dev Extends VaultComposerSyncPool with Pool-specific error handling:
 *      - Pool destinations: Bridge+Swap pattern on send failures (liquidity/slippage issues)
 *      - OFT destinations: Revert for LayerZero retry mechanism (config/gas issues)
 * @dev DepositAndSend and Deposit use WETH.
 * @dev If a transfer to NativePool fails, the asset (as WETH) is refunded to the user.
 * @dev Uses hubRecoveryAddress for Pool failure recovery, falling back to tx.origin
 * @dev Compatible with ERC4626 vaults and requires Share OFT to be an adapter
 */
contract VaultComposerSyncPoolNative is VaultComposerSyncPool, IVaultComposerSyncPoolNative {
    using OFTComposeMsgCodec for bytes32;
    using OFTComposeMsgCodec for bytes;
    using SafeERC20 for IERC20;

    /**
     * @notice Initializes the VaultComposerSyncPoolNative contract with vault and OFT token addresses
     * @param _vault The address of the ERC4626 vault contract
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _shareOFT The address of the share OFT contract (must be an adapter)
     * @param _defaultRecoveryAddress The address to receive tokens on Pool send failures if the compose message cannot be decoded
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Vault asset token must be WETH
     * - Asset token must be native - address(0), which is converted to WETH for vault operations
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(
        address _vault,
        address _assetOFT,
        address _shareOFT,
        address _defaultRecoveryAddress
    ) VaultComposerSyncPool(_vault, _assetOFT, _shareOFT, _defaultRecoveryAddress) {}

    /**
     * @notice Handles LayerZero compose operations for vault transactions with automatic refund functionality
     * @dev This composer is designed to handle refunds to an EOA address and not a contract
     * @dev Any revert in handleCompose() causes a refund back to the src EXCEPT for InsufficientMsgValue
     * @dev Overrides the parent contract to wrap ETH into WETH converting NativePool into Pool logic
     * @param _composeSender The OFT contract address used for refunds, must be either ASSET_OFT or SHARE_OFT
     * @param _guid LayerZero's unique tx id (created on the source tx)
     * @param _message Decomposable bytes object into [composeHeader][composeMessage]
     */
    function lzCompose(
        address _composeSender, // The OFT used on refund, also the vaultIn token.
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) public payable virtual override {
        uint256 amount = _message.amountLD();
        /// @dev Reduction of PoolNative into Pool by wrapping ETH into WETH
        /// @dev All internal logic handles WETH as the asset token making deposit symmetric to redemption
        _wrapNative(_composeSender, amount);

        super.lzCompose(_composeSender, _guid, _message, _executor, _extraData);
    }

    /**
     * @dev Unwrap WETH when sending to Stargate PoolNative and send via OFT
     * @dev Can only be called by self
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive tokens and native on Pool failure
     */
    function lzSend(address _oft, SendParam memory _sendParam, address _refundAddress) external payable override {
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);
        uint256 msgValue = msg.value;

        /// @dev Safe because this is the only function in VaultComposerSync that calls oft.send()
        /// @dev Always trigger Taxi mode for txs to Stargate (assets)
        /// @dev Stargate Pool take in ETH as underlying token so we need to convert WETH to ETH
        if (_oft == ASSET_OFT) {
            /// @dev Since we converted ETH to WETH in lzCompose, on deposit we have WETH at this point.
            /// @dev Incase of redemption the vault outputs WETH.
            /// @dev MsgValue passed to Stargate Pool is nativeFee + amountLD
            IWETH(ASSET_ERC20).withdraw(_sendParam.amountLD);
            msgValue += _sendParam.amountLD;
            /// @dev Always trigger Taxi mode for txs to Stargate (assets)
            _sendParam.oftCmd = hex"";
        }

        IOFT(_oft).send{ value: msgValue }(_sendParam, MessagingFee(msg.value, 0), _refundAddress);
    }

    /**
     * @dev Internal function to validate the asset token compatibility
     * @dev Validate part of the constructor in an overridable function since the asset token may not be the same as the OFT token
     * @dev For example, in the case of VaultComposerSyncPoolNative, the asset token is WETH but the OFT token is native
     * @dev Overridden to do nothing because WETH is the asset token for the vault but the OFT has native token as the token
     */
    function _validateAssetToken(address _assetOFT, IERC4626 _vault) internal override returns (address assetERC20) {
        if (IOFT(_assetOFT).token() != address(0)) revert StargatePoolTokenNotNative();
        assetERC20 = _vault.asset();
        IWETH(assetERC20).approve(address(_vault), type(uint256).max);
    }

    /**
     * @dev Internal function to wrap native into Vault asset
     * @dev Can be overridden to account for different asset tokens
     * @param _oft The OFT contract address to use for wrapping
     * @param _amount The amount of native to wrap
     */
    function _wrapNative(address _oft, uint256 _amount) internal virtual {
        if (_oft == ASSET_OFT) IWETH(ASSET_ERC20).deposit{ value: _amount }();
    }
}
