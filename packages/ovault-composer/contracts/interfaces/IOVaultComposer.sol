// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

struct FailedMessage {
    address oft;
    address refundOFT;
    SendParam sendParam;
}

interface IOVaultComposer is IOAppComposer {
    /// ========================== EVENTS =====================================
    event DecodeFailed(bytes32 indexed guid, address indexed oft, bytes message);
    event SlippageEncountered(uint256 amountLD, uint256 minAmountLD);
    event Sent(bytes32 indexed guid, address indexed oft);
    event SendFailed(bytes32 indexed guid, address indexed oft);
    event Refunded(bytes32 indexed guid, address indexed oft);
    event Retried(bytes32 indexed guid, address indexed oft);

    /// ========================== Error Messages =====================================
    error InvalidAdapterMesh();
    error InvalidOFTMesh();

    error OnlyEndpoint(address caller);
    error OnlySelf(address caller);
    error OnlyOFT(address oft);
    error OnlyAsset(address asset);
    error OnlyShare(address share);
    error InvalidSendParam(SendParam sendParam);
    error NotEnoughTargetTokens(uint256 amountLD, uint256 minAmountLD);

    /// ========================== GLOBAL VARIABLE FUNCTIONS =====================================
    function ASSET_OFT() external view returns (address);
    function SHARE_OFT() external view returns (address);
    function ENDPOINT() external view returns (address);
    function OPTIMISTICALLY_CONVERT_TOKENS() external view returns (bool);

    /// ========================== FUNCTIONS =====================================
    function executeOVaultAction(address _oft, uint256 _amount, uint256 _minAmountLD) external;

    function refund(bytes32 guid, bytes memory extraOptions) external payable;
    function retry(bytes32 guid, bytes memory extraOptions) external payable;
    function send(address _oft, SendParam memory _sendParam) external payable;

    receive() external payable;
}
