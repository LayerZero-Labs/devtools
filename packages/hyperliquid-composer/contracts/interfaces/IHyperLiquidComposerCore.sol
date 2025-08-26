// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IHyperLiquidComposerErrors } from "./IHyperLiquidComposerErrors.sol";

struct IHyperAsset {
    uint64 coreIndexId; // 8 bytes
    int64 decimalDiff; // 8 bytes
    address assetBridgeAddress; // 20 bytes (fits in same slot)
}

struct IHyperAssetAmount {
    uint256 evm;
    uint256 dust; // This is the refund on hyperevm amount
    uint64 core;
}

struct FailedMessage {
    SendParam refundSendParam;
    uint256 msgValue;
}

interface IHyperLiquidComposerCore is IHyperLiquidComposerErrors {
    event RefundSuccessful(bytes32 indexed guid);

    event FailedMessageDecode(bytes32 indexed guid, bytes32 sender, uint256 msgValue, bytes composeMessage);

    event CompleteRefund();
    event RefundHyperEVM(address indexed receiver, uint256 indexed amountERC20, uint256 indexed amountHYPE);

    function MIN_GAS() external view returns (uint256);
    function VALID_COMPOSE_MSG_LEN() external view returns (uint256);

    function ENDPOINT() external view returns (address);
    function OFT() external view returns (address);
    function TOKEN() external view returns (address);
    function REFUND_ADDRESS() external view returns (address);

    function oftAsset() external view returns (uint64, int64, address);
    function hypeAsset() external view returns (uint64, int64, address);

    function hypeIndexByChainId(uint256 _chainId) external view returns (uint64);

    function refundToSrc(bytes32 guid) external payable;

    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) external returns (IHyperAssetAmount memory);
}
