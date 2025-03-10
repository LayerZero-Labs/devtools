// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

interface IHyperLiquidComposer is IOAppComposer {
    error HyperLiquidComposer_InvalidCall_NotEndpoint(address _notEndpointAddress);
    error HyperLiquidComposer_InvalidCall_NotOFT(address _internalOFTAddress, address _receivedOFTAddress);
    error HyperLiquidComposer_InvalidCall_TokenDoesNotSupportExtension(address _oft, address _token);

    function HL_NATIVE_TRANSFER_CORE_INDEX_ID() external view returns (uint256);
    function HL_NATIVE_TRANSFER() external view returns (address);
}
