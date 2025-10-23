// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IVaultComposerSync is IOAppComposer {
    /// ========================== EVENTS =====================================
    event Sent(bytes32 indexed guid); // 0x27b5aea9
    event Refunded(bytes32 indexed guid); // 0xfe509803

    event Deposited(bytes32 sender, bytes32 recipient, uint32 dstEid, uint256 assetAmt, uint256 shareAmt); // 0xa53b96f2
    event Redeemed(bytes32 sender, bytes32 recipient, uint32 dstEid, uint256 shareAmt, uint256 assetAmt); // 0x57e232f1

    /// ========================== Error Messages =====================================
    error ShareOFTNotAdapter(address shareOFT); // 0xfc1514ae
    error ShareTokenNotVault(address shareERC20, address vault); // 0x0e178ab6
    error AssetTokenNotVaultAsset(address assetERC20, address vaultAsset); // 0xba9d665f

    error OnlyEndpoint(address caller); // 0x91ac5e4f
    error OnlySelf(address caller); // 0xa19dbf00
    error OnlyValidComposeCaller(address caller); // 0x84fb3f0d

    error InsufficientMsgValue(uint256 expectedMsgValue, uint256 actualMsgValue); // 0x7cb769dc
    error NoMsgValueExpected(); // 0x7578d2bd

    error SlippageExceeded(uint256 amountLD, uint256 minAmountLD); // 0x71c4efed

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function VAULT() external view returns (IERC4626);

    function ASSET_OFT() external view returns (address);
    function ASSET_ERC20() external view returns (address);
    function SHARE_OFT() external view returns (address);
    function SHARE_ERC20() external view returns (address);

    function ENDPOINT() external view returns (address);
    function VAULT_EID() external view returns (uint32);

    /// ========================== Proxy OFT =====================================

    /**
     * @notice Deposits ERC20 assets from the caller into the vault and sends them to the recipient
     * @param assetAmount The number of ERC20 tokens to deposit and send
     * @param sendParam Parameters on how to send the shares to the recipient
     * @param refundAddress Address to receive excess `msg.value`
     */
    function depositAndSend(uint256 assetAmount, SendParam memory sendParam, address refundAddress) external payable;

    /**
     * @notice Redeems vault shares and sends the resulting assets to the user
     * @param shareAmount The number of vault shares to redeem
     * @param sendParam Parameter that defines how to send the assets
     * @param refundAddress Address to receive excess payment of the LZ fees
     */
    function redeemAndSend(uint256 shareAmount, SendParam memory sendParam, address refundAddress) external payable;

    /**
     * @notice Quotes the send operation for the given OFT and SendParam
     * @param from The "sender address" used for the quote
     * @param targetOft The OFT contract address to quote
     * @param vaultInAmount The amount of tokens to send to the vault
     * @param sendParam The parameters for the send operation
     * @return MessagingFee The estimated fee for the send operation
     * @dev This function can be overridden to implement custom quoting logic
     */
    function quoteSend(
        address from,
        address targetOft,
        uint256 vaultInAmount,
        SendParam memory sendParam
    ) external view returns (MessagingFee memory);
}
