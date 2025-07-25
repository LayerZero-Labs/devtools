// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IVaultComposerSync is IOAppComposer {
    /// ========================== EVENTS =====================================
    event Sent(bytes32 indexed guid); // 0x27b5aea9
    event Refunded(bytes32 indexed guid); // 0xfe509803

    /// ========================== Error Messages =====================================
    error ShareOFTNotAdapter(address shareOFT); // 0xfc1514ae
    error ShareTokenNotVault(address shareERC20, address vault); // 0x0e178ab6
    error AssetTokenNotVaultAsset(address assetERC20, address vaultAsset); // 0xba9d665f

    error OnlyEndpoint(address caller); // 0x91ac5e4f
    error OnlySelf(address caller); // 0xa19dbf00
    error OnlyValidComposeCaller(address caller); // 0x84fb3f0d

    error InsufficientMsgValue(uint256 expectedMsgValue, uint256 actualMsgValue); // 0x7cb769dc

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
    function depositAndSend(uint256 assetAmount, SendParam memory sendParam, address refundAddress) external payable;
    function redeemAndSend(uint256 shareAmount, SendParam memory sendParam, address refundAddress) external payable;

    function quoteSend(address oft, SendParam memory sendParam) external view returns (MessagingFee memory);

    /// ========================== Receive =====================================
    receive() external payable;
}
