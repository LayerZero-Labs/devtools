// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

struct FailedMessage {
    address oft;
    SendParam sendParam;
    address refundOFT;
    SendParam refundSendParam;
}

enum FailedState {
    NotFound,
    CanOnlyRefund,
    CanOnlyRetry,
    CanRetryWithSwapOrRefund
}

interface IOVaultComposer is IOAppComposer {
    /// ========================== EVENTS =====================================
    event DecodeFailed(bytes32 indexed guid, address indexed oft, bytes message);
    event Sent(bytes32 indexed guid, address indexed oft);
    event SentOnHub(address indexed receiver, address indexed oft, uint256 amountLD);
    event SendFailed(bytes32 indexed guid, address indexed oft);
    event Refunded(bytes32 indexed guid, address indexed oft);
    event Retried(bytes32 indexed guid, address indexed oft);
    event RetriedWithSwap(bytes32 indexed guid, address indexed oft);
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
    error CanNotWithdraw(bytes32 guid);
    error NotEnoughTargetTokens(uint256 amountLD, uint256 minAmountLD);

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function ASSET_OFT() external view returns (address);
    function SHARE_OFT() external view returns (address);
    function ENDPOINT() external view returns (address);

    /// ========================== FUNCTIONS =====================================
    function refund(bytes32 guid, bytes memory extraOptions) external payable;
    function retry(bytes32 guid, bytes memory extraOptions) external payable;
    function retryWithSwap(bytes32 guid, bytes memory extraOptions) external payable;

    function failedGuidState(bytes32 guid) external view returns (FailedState);

    receive() external payable;
}
