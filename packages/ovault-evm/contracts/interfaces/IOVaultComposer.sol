// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IOVaultComposer is IOAppComposer {
    /// ========================== EVENTS =====================================
    event Sent(bytes32 indexed guid);
    event SentOnHub(address indexed receiver, uint256 shares);

    event Refunded(bytes32 indexed guid);

    /// ========================== Error Messages =====================================
    error ShareOFTShouldBeLockboxAdapter(address share);
    error AssetOFTInnerTokenShouldBeOvaultAsset(address assetInnerToken, address vaultAsset);
    error ShareOFTInnerTokenShouldBeOVault(address shareInnerToken, address vaultToken);

    error OnlyEndpoint(address caller);
    error OnlySelf(address caller);
    error OFTCannotVaultOperation(address oft);

    error InvalidMsgValue(uint256 expectedMsgValue, uint256 msgValuePassed);

    error SlippageEncountered(uint256 amountLD, uint256 minAmountLD);

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function ASSET_OFT() external view returns (address);
    function SHARE_OFT() external view returns (address);
    function ENDPOINT() external view returns (address);

    /// ========================== Proxy OFT =====================================
    function depositAndSend(uint256 assetAmount, SendParam memory sendParam, address refundAddress) external payable;
    function redeemAndSend(uint256 shareAmount, SendParam memory sendParam, address refundAddress) external payable;

    function quoteSend(address oft, SendParam memory sendParam) external view returns (MessagingFee memory);

    /// ========================== Receive =====================================
    receive() external payable;
}
