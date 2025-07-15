// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { FailedMessage } from "../../contracts/interfaces/IOVaultComposer.sol";

import { OVaultComposer } from "../../contracts/OVaultComposer.sol";

contract MockOVaultComposer is OVaultComposer {
    SendParam public blankSendParam;

    constructor(
        address _ovault,
        address _assetOFT,
        address _shareOFT,
        address _refundOverpayAddress
    ) OVaultComposer(_ovault, _assetOFT, _shareOFT, _refundOverpayAddress) {}

    function setFailedMessageRetry(bytes32 _guid, address _oft, SendParam memory _sendParam) external payable {
        failedMessages[_guid] = FailedMessage(_oft, _sendParam, address(0), blankSendParam, msg.value);
    }

    function setFailedMessageRefund(
        bytes32 _guid,
        address _refundOFT,
        SendParam memory _refundSendParam
    ) external payable {
        failedMessages[_guid] = FailedMessage(address(0), blankSendParam, _refundOFT, _refundSendParam, msg.value);
    }

    function setFailedMessageRetryWithSwap(
        bytes32 _guid,
        address _oft,
        SendParam memory _sendParam,
        address _refundOFT,
        SendParam memory _refundSendParam
    ) external payable {
        failedMessages[_guid] = FailedMessage(_oft, _sendParam, _refundOFT, _refundSendParam, msg.value);
    }
}
