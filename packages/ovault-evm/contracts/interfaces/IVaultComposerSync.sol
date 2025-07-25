// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IVaultComposerSync is IOAppComposer {
    /// ========================== EVENTS =====================================
    event Sent(bytes32 indexed guid);
    event Refunded(bytes32 indexed guid);

    /// ========================== Error Messages =====================================
    error ShareOFTNotAdapter(address shareOFT);
    error ShareTokenNotVault(address shareERC20, address vault);
    error AssetTokenNotVaultAsset(address assetERC20, address vaultAsset);

    error OnlyEndpoint(address caller);
    error OnlySelf(address caller);
    error OnlyValidComposeCaller(address caller);

    error InsufficientMsgValue(uint256 expectedMsgValue, uint256 actualMsgValue);

    error SlippageExceeded(uint256 amountLD, uint256 minAmountLD);

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function VAULT() external view returns (IERC4626);

    function ASSET_OFT() external view returns (address);
    function ASSET_ERC20() external view returns (address);
    function SHARE_OFT() external view returns (address);
    function SHARE_ERC20() external view returns (address);

    function ENDPOINT() external view returns (address);
    function VAULT_EID() external view returns (uint32);

    /// ========================== Proxy OFT =====================================
    function depositAndSend(uint256 assetAmount, SendParam memory sendParam, address refundAddress) external payable;
    function redeemAndSend(uint256 shareAmount, SendParam memory sendParam, address refundAddress) external payable;

    function quoteSend(address oft, SendParam memory sendParam) external view returns (MessagingFee memory);

    /// ========================== Receive =====================================
    receive() external payable;
}
