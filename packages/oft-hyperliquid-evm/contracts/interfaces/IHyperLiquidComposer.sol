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
    // 0xeee35e6f
    error HyperLiquidComposer_InvalidCall_NotEndpoint(address notEndpointAddress);
    // 0x86fee0c0
    error HyperLiquidComposer_InvalidCall_NotOFT(address internalOFTAddress, address receivedOFTAddress);
    // 0xb7e54a07
    error HyperLiquidComposer_FailedToSend_HYPE(uint256 amount);
    // 0x9a9d2b7a
    error HyperLiquidComposer_FailedToReturn_HYPE_Dust(address to, uint256 amount);

    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) external view returns (HyperAssetAmount memory);
    function getOFTAsset() external view returns (HyperAsset memory);
    function getHypeAsset() external view returns (HyperAsset memory);
}
