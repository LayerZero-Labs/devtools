// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IVaultComposerSyncNative } from "./interfaces/IVaultComposerSyncNative.sol";
import { IWETH } from "./interfaces/IWETH.sol";

import { VaultComposerSync } from "./VaultComposerSync.sol";

/**
 * @title Synchronous Vault Composer with Stargate NativePools as Asset and WETH as Share
 * @author LayerZero Labs (@shankars99)
 * @dev Extends VaultComposerSyncPool with Pool-specific error handling:
 *      - Pool destinations: Bridge+Swap pattern on send failures (liquidity/slippage issues)
 *      - OFT destinations: Revert for LayerZero retry mechanism (config/gas issues)
 * @dev DepositAndSend and Deposit use WETH.
 * @dev Uses hubRecoveryAddress for Pool failure recovery, falling back to tx.origin
 * @dev Compatible with ERC4626 vaults and requires Share OFT to be an adapter
 */
contract VaultComposerSyncNative is VaultComposerSync, IVaultComposerSyncNative {
    /**
     * @notice Initializes the VaultComposerSyncPoolNative contract with vault and OFT token addresses
     * @param _vault The address of the ERC4626 vault contract
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _shareOFT The address of the share OFT contract (must be an adapter)
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Vault asset token must be Wrapped Native Token (WETH)
     * - Asset token must be native - address(0), which is converted to WETH for vault operations
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(address _vault, address _assetOFT, address _shareOFT) VaultComposerSync(_vault, _assetOFT, _shareOFT) {}

    /**
     * @notice Deposits Native token (ETH) from the caller into the vault and sends them to the recipient
     * @param _assetAmount The number of Native token (ETH) to deposit and send
     * @param _sendParam Parameters on how to send the shares to the recipient
     * @param _refundAddress Address to receive excess `msg.value`
     */
    function depositNativeAndSend(
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable {
        if (msg.value < _assetAmount) revert AmountExceedsMsgValue();

        _wrapNative(_assetAmount);
        /// @dev Reduce msg.value to the amount used as Fee for the lzSend operation
        this.depositAndSend{ value: msg.value - _assetAmount }(_assetAmount, _sendParam, _refundAddress);
    }

    /**
     * @dev Unwrap WETH when sending to Stargate PoolNative and send via OFT
     * @dev Overriden to unwrap WETH when sending to Stargate PoolNative
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive tokens and native on Pool failure
     */
    function _sendRemote(address _oft, SendParam memory _sendParam, address _refundAddress) internal override {
        uint256 msgValue = msg.value;

        /// @dev Safe because this is the only function in VaultComposerSync that calls oft.send()
        /// @dev Stargate Pool takes in ETH as underlying token so we need to convert WETH to ETH
        if (_oft == ASSET_OFT) {
            /// @dev Since we converted ETH to WETH in lzCompose, on deposit we have WETH at this point.
            /// @dev Incase of redemption the vault outputs WETH.
            _unwrapNative(_sendParam.amountLD);
            /// @dev MsgValue passed to Stargate Pool is nativeFee + amountLD
            msgValue += _sendParam.amountLD;
        }

        IOFT(_oft).send{ value: msgValue }(_sendParam, MessagingFee(msg.value, 0), _refundAddress);
    }

    /**
     * @dev Internal function to wrap native into Vault asset
     * @dev Can be overridden to account for different native wrapped tokens
     * @param _amount The amount of native to wrap
     */
    function _wrapNative(uint256 _amount) internal virtual {
        IWETH(ASSET_ERC20).deposit{ value: _amount }();
    }

    /**
     * @dev Internal function to unwrap native from Vault asset
     * @dev Can be overridden to account for different native wrapped tokens
     * @param _amount The amount of native to unwrap
     */
    function _unwrapNative(uint256 _amount) internal virtual {
        IWETH(ASSET_ERC20).withdraw(_amount);
    }

    /**
     * @dev Internal function to validate the asset token compatibility
     * @dev In VaultComposerSyncNative, the asset token is WETH but the OFT token is native (ETH)
     * @param _assetOFT The address of the asset OFT (Omnichain Fungible Token) contract
     * @param _vault The address of the vault contract
     * @return assetERC20 The address of the asset ERC20 token
     */
    function _initializeAssetToken(address _assetOFT, IERC4626 _vault) internal override returns (address assetERC20) {
        if (IOFT(_assetOFT).token() != address(0)) revert AssetOFTTokenNotNative();
        assetERC20 = _vault.asset();
        IWETH(assetERC20).approve(address(_vault), type(uint256).max);
    }

    receive() external payable override {
        /// @dev Reduction of ComposerNative into ComposerBase by wrapping ETH into WETH
        /// @dev All internal logic handles WETH as the asset token making deposit symmetric to redemption
        /// @dev The native token used here was populated during lzReceive
        if (msg.sender == ASSET_OFT) _wrapNative(msg.value);
    }
}
