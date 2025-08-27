// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

struct IHyperAsset {
    uint64 coreIndexId; /// 8 bytes
    int64 decimalDiff; /// 8 bytes : @dev is computed as evm decimals - core decimals
    address assetBridgeAddress; /// 20 bytes (fits in same slot)
}

struct IHyperAssetAmount {
    uint256 evm;
    uint64 core;
    uint64 coreBalanceAssetBridge;
}

struct FailedMessage {
    SendParam refundSendParam;
    uint256 msgValue;
}

interface IHyperLiquidComposer {
    /// ----------------------------------- EVENTS -----------------------------------
    event RefundSuccessful(bytes32 indexed guid);

    event FailedMessageDecode(bytes32 indexed guid, bytes32 sender, uint256 msgValue, bytes composeMessage);

    event CompleteRefund();
    event RefundHyperEVM(address indexed receiver, uint256 indexed amountERC20, uint256 indexed amountHYPE);

    /// ----------------------------------- ERRORS -----------------------------------
    error InsufficientGas(uint256 gasLeft, uint256 minGas);

    error InvalidOFTAddress();

    error OnlyEndpoint();
    error InvalidComposeCaller(address internalOFTAddress, address receivedOFTAddress);
    error OnlySelf(address caller);

    error InsufficientMsgValue(uint256 msgValue, uint256 requiredValue);
    error ComposeMsgLengthNot64Bytes(uint256 length);

    error CoreUserNotActivated();
    error TransferAmtExceedsAssetBridgeBalance(IHyperAssetAmount amounts);
    error NativeTransferFailed(address receiver, uint256 amount);

    error SpotBalanceReadFailed(address user, uint64 tokenId);

    error FailedMessageNotFound(bytes32 guid);

    /// ------------------------ CONSTANTS/VARIABLES/FUNCTIONS ------------------------
    function MIN_GAS() external view returns (uint256);
    function VALID_COMPOSE_MSG_LEN() external view returns (uint256);

    function ENDPOINT() external view returns (address);
    function OFT() external view returns (address);
    function ERC20() external view returns (address);

    function erc20Asset() external view returns (uint64 coreIndexId, int64 decimalDiff, address assetBridgeAddress);
    function hypeAsset() external view returns (uint64 coreIndexId, int64 decimalDiff, address assetBridgeAddress);

    function decodeMessage(bytes calldata composeMessage) external pure returns (uint256 minMsgValue, address receiver);
    function refundToSrc(bytes32 guid) external payable;
    function quoteHyperCoreAmount(
        uint256 amount,
        IHyperAsset memory asset
    ) external view returns (IHyperAssetAmount memory);
}
