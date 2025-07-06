// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

struct FailedMessage {
    address oft;
    SendParam sendParam;
    address refundOFT;
    SendParam refundSendParam;
    uint256 msgValue;
}

enum FailedState {
    NotFound,
    CanOnlyRefund,
    CanOnlyRetry,
    CanRefundOrRetryWithSwap
}

interface IOVaultComposer is IOAppComposer {
    /// ========================== EVENTS =====================================
    event DecodeFailed(bytes32 indexed guid, address indexed oft, bytes message);

    event Sent(bytes32 indexed guid, address indexed oft);
    event SentOnHub(address indexed receiver, address indexed oft, uint256 amountLD);

    event Refunded(bytes32 indexed guid, address indexed oft);
    event Retried(bytes32 indexed guid, address indexed oft);
    event SwappedTokens(bytes32 indexed guid);

    event SendFailed(bytes32 indexed guid, address indexed oft);
    event OVaultError(bytes32 indexed guid, address indexed oft, bytes errMsg);
    event NoPeer(bytes32 indexed guid, address indexed oft, uint32 dstEid);

    /// ========================== Error Messages =====================================
    error ShareOFTShouldBeLockboxAdapter(address share);
    error AssetOFTInnerTokenShouldBeOvaultAsset(address assetInnerToken, address vaultAsset);
    error ShareOFTInnerTokenShouldBeOVault(address shareInnerToken, address vaultToken);

    error OnlyEndpoint(address caller);
    error OnlySelf(address caller);
    error OnlyOFT(address oft);
    error OnlyAsset(address asset);
    error OnlyShare(address share);

    error CanNotRefund(bytes32 guid);
    error CanNotRetry(bytes32 guid);
    error CanNotSwap(bytes32 guid);
    error CanNotWithdraw(bytes32 guid);

    error NoMsgValueWhenSkippingRetry();
    error NotEnoughTargetTokens(uint256 amountLD, uint256 minAmountLD);

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function ASSET_OFT() external view returns (address);
    function SHARE_OFT() external view returns (address);
    function ENDPOINT() external view returns (address);
    function HUB_EID() external view returns (uint32);
    function REFUND_OVERPAY_ADDRESS() external view returns (address);

    function ASSET_DECIMAL_CONVERSION_RATE() external view returns (uint256);
    function SHARE_DECIMAL_CONVERSION_RATE() external view returns (uint256);

    /// ========================== FUNCTIONS =====================================
    function refund(bytes32 guid) external payable;
    function retry(bytes32 guid, bool removeExtraOptions) external payable;
    function retryWithSwap(bytes32 guid, bool skipRetry) external payable;

    function sendFailedMessage(
        bytes32 _guid,
        address _oft,
        SendParam memory _sendParam,
        uint256 _prePaidMsgValue,
        address _refundOverpayAddress
    ) external payable;

    function failedGuidState(bytes32 guid) external view returns (FailedState);

    receive() external payable;
}
