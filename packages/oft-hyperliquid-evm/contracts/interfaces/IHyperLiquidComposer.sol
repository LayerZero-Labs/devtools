// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

struct HyperAsset {
    address assetBridgeAddress;
    uint64 coreIndexId;
    uint64 decimalDiff;
}

struct HyperAssetAmount {
    uint256 evm;
    uint256 dust;
    uint64 core;
}

interface IHyperLiquidComposer is IOAppComposer {
    error HyperLiquidComposer_InvalidCall_NotEndpoint(address _notEndpointAddress);
    error HyperLiquidComposer_InvalidCall_NotOFT(address _internalOFTAddress, address _receivedOFTAddress);
    error HyperLiquidComposer_FailedToSend_HYPE(uint256 _amount);
    error HyperLiquidComposer_FailedToReturn_HYPE_Dust(uint256 _amount);

    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) external view returns (HyperAssetAmount memory);
    function getOFTAsset() external view returns (HyperAsset memory);
    function getHypeAsset() external view returns (HyperAsset memory);
}
