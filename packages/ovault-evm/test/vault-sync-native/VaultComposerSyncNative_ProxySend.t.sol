// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { VaultComposerSyncNative } from "../../contracts/VaultComposerSyncNative.sol";
import { VaultComposerSyncProxySendTest } from "../vault-sync/VaultComposerSync_ProxySend.t.sol";
import { VaultComposerSyncNativeBaseTest } from "./VaultComposerSyncNative_Base.t.sol";

contract VaultComposerSyncNativeProxySendTest is VaultComposerSyncProxySendTest, VaultComposerSyncNativeBaseTest {
    VaultComposerSyncNative vaultComposerNative;

    function setUp() public virtual override(VaultComposerSyncProxySendTest, VaultComposerSyncNativeBaseTest) {
        super.setUp();
        vaultComposerNative = VaultComposerSyncNative(payable(address(vaultComposer)));
    }

    function test_depositNativeAndSend_target_hub() public {
        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");

        vm.startPrank(userA);
        vaultComposerNative.depositNativeAndSend{ value: TOKENS_TO_SEND }(TOKENS_TO_SEND, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
    }

    function test_depositNativeAndSend_target_hub_can_have_dust() public {
        uint256 amountWithDust = TOKENS_TO_SEND + 1; // 1 extra token to test dust handling

        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), amountWithDust, 0, "", "", "");

        vm.startPrank(userA);
        vaultComposerNative.depositNativeAndSend{ value: amountWithDust }(amountWithDust, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.balanceOf(userA), amountWithDust);
        assertEq(assetToken_arb.balanceOf(address(vault_arb)), amountWithDust);
    }

    function test_depositNativeAndSend_target_not_hub() public {
        SendParam memory sendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");

        MessagingFee memory fee = vaultComposer.quoteSend(userA, address(shareOFT_arb), TOKENS_TO_SEND, sendParam);

        vm.startPrank(userA);
        vaultComposerNative.depositNativeAndSend{ value: TOKENS_TO_SEND + fee.nativeFee }(
            TOKENS_TO_SEND,
            sendParam,
            userA
        );
        vm.stopPrank();

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), TOKENS_TO_SEND);
        assertEq(shareOFT_pol.balanceOf(userA), 0);

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertEq(shareOFT_pol.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(vault_arb.balanceOf(userA), 0);
    }
}
