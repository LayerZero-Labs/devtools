// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IVaultComposerSync } from "./IVaultComposerSync.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IVaultComposerSyncNative {
    error AssetOFTTokenNotNative(); // 0xb599c975
    error AmountExceedsMsgValue(); // 0x0f971d59

    /**
     * @notice Deposits Native token (ETH) from the caller into the vault and sends them to the recipient
     * @param _assetAmount The number of Native token (ETH) to deposit and send
     * @param _sendParam Parameters on how to send the shares to the recipient
     * @param _refundAddress Address to receive excess `msg.value`
     */
    function depositNativeAndSend(
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable;
}
