// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ErrorMessagePayload {
    address refundTo;
    uint256 refundAmount;
    bytes errorMessage;
}

interface IHyperLiquidComposerErrors {
    error InsufficientGas(uint256 gasLeft, uint256 minGas);

    error InvalidOFTAddress();
    error UnsupportedChainId(uint256 chainId);

    error OnlyEndpoint();
    error InvalidComposeCaller(address internalOFTAddress, address receivedOFTAddress);
    error OnlySelf(address caller);

    error InsufficientMsgValue(uint256 msgValue, uint256 requiredValue);
    error ComposeMsgLengthNot64Bytes(uint256 length);

    error NativeTransferFailed(address receiver, uint256 amount);

    error SpotBalanceReadFailed(address user, uint64 tokenId);

    error FailedMessageNotFound(bytes32 guid);
}
