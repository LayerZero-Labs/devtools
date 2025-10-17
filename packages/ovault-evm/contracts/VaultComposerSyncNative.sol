// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IVaultComposerSyncNative } from "./interfaces/IVaultComposerSyncNative.sol";
import { IWETH } from "./interfaces/IWETH.sol";

import { VaultComposerSync } from "./VaultComposerSync.sol";

/**
 * @title Synchronous Vault Composer with Stargate NativePools as Asset and WETH as Share
 * @author LayerZero Labs (@shankars99)
 * @dev Extends VaultComposerSync with Pool-specific behavior such as oft.token wrapping
 * @dev WETH is used as the share token for the vault instead of native token (ETH)
 * @dev DepositAndSend and Deposit use WETH instead of native token (ETH)
 * @dev DepositNativeAndSend allows for deposits with ETH
 * @dev Compatible with ERC4626 vaults and requires Share OFT to be an adapter
 */
contract VaultComposerSyncNative is VaultComposerSync, IVaultComposerSyncNative {
    using OFTComposeMsgCodec for bytes;

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
     * @dev Reduction of ComposerNative into ComposerBase by wrapping ETH into WETH
     * @dev All internal logic handles WETH as the asset token making deposit symmetric to redemption
     * @dev The native token used here was sent during lzReceive from the Pool
     * @dev lzCompose calls comes from the Endpoint and are not affected by the wrapNative call
     */
    function lzCompose(
        address _composeSender, // The OFT used on refund, also the vaultIn token.
        bytes32 _guid,
        bytes calldata _message, // expected to contain a composeMessage = abi.encode(SendParam hopSendParam,uint256 minMsgValue)
        address _executor,
        bytes calldata _extraData
    ) public payable virtual override {
        /// @dev Wrap ETH received during lzReceive into WETH
        if (_composeSender == ASSET_OFT) IWETH(ASSET_ERC20).deposit{ value: _message.amountLD() }();

        /// @dev Since lzCompose is public, the msg.value called to pay the tx Fee is automatically forwarded
        super.lzCompose(_composeSender, _guid, _message, _executor, _extraData);
    }

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

        IWETH(ASSET_ERC20).deposit{ value: _assetAmount }();

        /// @dev Reduce msg.value to the amount used as Fee for the lzSend operation
        _depositAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _assetAmount,
            _sendParam,
            _refundAddress,
            msg.value - _assetAmount
        );
    }

    /**
     * @dev Unwrap WETH when sending to Stargate PoolNative and send via OFT
     * @dev Overriden to unwrap WETH when sending to Stargate PoolNative
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive tokens and native on Pool failure
     * @param _msgValue The amount of native tokens sent with the transaction
     */
    function _sendRemote(
        address _oft,
        SendParam memory _sendParam,
        address _refundAddress,
        uint256 _msgValue
    ) internal override {
        /// @dev _msgValue passed in this call is used as LayerZero fee
        uint256 msgValue = _msgValue;

        /// @dev Safe because this is the only function in VaultComposerSync that calls oft.send()
        if (_oft == ASSET_OFT) {
            /// @dev In deposit's lzReceive() we converted ETH to WETH.
            /// @dev Incase of redemption the vault outputs WETH.
            /// @dev So we always have WETH at this point which we unwrap to ETH for the Stargate Pool
            IWETH(ASSET_ERC20).withdraw(_sendParam.amountLD);
            /// @dev MsgValue passed to Stargate Pool is nativeFee + amountLD
            msgValue += _sendParam.amountLD;
        }

        IOFT(_oft).send{ value: msgValue }(_sendParam, MessagingFee(_msgValue, 0), _refundAddress);
    }

    /**
     * @dev Internal function to validate the asset token compatibility
     * @dev In VaultComposerSyncNative, the asset token is WETH but the OFT token is native (ETH)
     * @return assetERC20 The address of the asset ERC20 token
     */
    function _initializeAssetToken() internal override returns (address assetERC20) {
        assetERC20 = VAULT.asset();

        if (IOFT(ASSET_OFT).token() != address(0)) revert AssetOFTTokenNotNative();

        /// @dev The asset OFT does NOT need approval since it operates in native ETH.
        // if (IOFT(ASSET_OFT).approvalRequired()) IERC20(assetERC20).approve(ASSET_OFT, type(uint256).max);

        IWETH(assetERC20).approve(address(VAULT), type(uint256).max);
    }
}
