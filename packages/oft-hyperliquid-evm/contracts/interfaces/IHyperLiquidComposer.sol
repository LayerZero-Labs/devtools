// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";

interface IHyperLiquidComposer is IOAppComposer {
    error HyperLiquidComposer_NotValidCaller(address _caller);
    error HyperLiquidComposer_ReceiverHasInsufficientBalance(uint256 _receiverBalance, uint256 _amountLD);

    function sendToL1(address from, address to, uint256 amount) external;
    function encodeMessage(address _receiver, uint256 _amountLD) external returns (bytes memory _message);
    function addApprovedCaller(address _caller) external;
    function removeApprovedCaller(address _caller) external;
    function isApprovedCaller(address _caller) external view returns (bool);
}
