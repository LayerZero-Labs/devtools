// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IVaultComposerSync } from "../../contracts/interfaces/IVaultComposerSync.sol";
import { VaultComposerSyncBaseTest } from "./VaultComposerSync_Base.t.sol";

contract VaultComposerSyncProxySendTest is VaultComposerSyncBaseTest {
    using OptionsBuilder for bytes;

    function setUp() public virtual override {
        super.setUp();
    }

    function test_target_is_hub_reverts_when_msg_value_provided() public {
        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetToken_arb.mint(address(userA), TOKENS_TO_SEND);
        vault_arb.mint(address(userA), TOKENS_TO_SEND);

        vm.startPrank(userA);
        assetToken_arb.approve(address(vaultComposer), TOKENS_TO_SEND);
        vault_arb.approve(address(vaultComposer), TOKENS_TO_SEND);

        vm.expectRevert(IVaultComposerSync.NoMsgValueExpected.selector);
        vaultComposer.depositAndSend{ value: 1 wei }(TOKENS_TO_SEND, sendParam, userA);

        vm.expectRevert(IVaultComposerSync.NoMsgValueExpected.selector);
        vaultComposer.redeemAndSend{ value: 2 wei }(TOKENS_TO_SEND, sendParam, userA);
        vm.stopPrank();
    }

    function test_depositSend_target_hub() public {
        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetToken_arb.mint(address(userA), TOKENS_TO_SEND);

        vm.startPrank(userA);
        assetToken_arb.approve(address(vaultComposer), TOKENS_TO_SEND);
        vaultComposer.depositAndSend(TOKENS_TO_SEND, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(assetToken_arb.balanceOf(userA), 0);
    }

    function test_depositSend_target_hub_can_have_dust() public {
        uint256 amountWithDust = TOKENS_TO_SEND + 1; // 1 extra token to test dust handling

        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), amountWithDust, 0, "", "", "");
        assetToken_arb.mint(address(userA), amountWithDust);

        vm.startPrank(userA);
        assetToken_arb.approve(address(vaultComposer), amountWithDust);
        vaultComposer.depositAndSend(amountWithDust, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.balanceOf(userA), amountWithDust);
        assertEq(assetToken_arb.balanceOf(userA), 0);
    }

    function test_redeemSend_target_hub() public {
        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetToken_arb.mint(address(vault_arb), TOKENS_TO_SEND);
        vault_arb.mint(address(userA), TOKENS_TO_SEND);

        vm.startPrank(userA);
        vault_arb.approve(address(vaultComposer), TOKENS_TO_SEND);
        vaultComposer.redeemAndSend(TOKENS_TO_SEND, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.balanceOf(userA), 0);
        assertEq(assetToken_arb.balanceOf(userA), TOKENS_TO_SEND);
    }

    function test_redeemSend_target_hub_can_have_dust() public {
        uint256 amountWithDust = TOKENS_TO_SEND + 1; // 1 extra token to test dust handling

        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), amountWithDust, 0, "", "", "");
        assetToken_arb.mint(address(vault_arb), amountWithDust);
        vault_arb.mint(address(userA), amountWithDust);

        vm.startPrank(userA);
        vault_arb.approve(address(vaultComposer), amountWithDust);
        vaultComposer.redeemAndSend(amountWithDust, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.balanceOf(userA), 0);
        assertEq(assetToken_arb.balanceOf(userA), amountWithDust);
    }

    function test_depositSend_target_not_hub() public {
        SendParam memory sendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetToken_arb.mint(address(userA), TOKENS_TO_SEND);

        MessagingFee memory fee = vaultComposer.quoteSend(userA, address(shareOFT_arb), TOKENS_TO_SEND, sendParam);

        vm.startPrank(userA);
        assetToken_arb.approve(address(vaultComposer), TOKENS_TO_SEND);
        vaultComposer.depositAndSend{ value: fee.nativeFee }(TOKENS_TO_SEND, sendParam, userA);
        vm.stopPrank();

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), TOKENS_TO_SEND);
        assertEq(shareOFT_pol.balanceOf(userA), 0);

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertEq(shareOFT_pol.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(vault_arb.balanceOf(userA), 0);
    }

    function test_redeemSend_target_not_hub() public {
        SendParam memory sendParam = SendParam(ETH_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetToken_arb.mint(address(vault_arb), TOKENS_TO_SEND);
        vault_arb.mint(address(userA), TOKENS_TO_SEND);

        MessagingFee memory fee = vaultComposer.quoteSend(userA, address(assetOFT_arb), TOKENS_TO_SEND, sendParam);

        vm.startPrank(userA);
        vault_arb.approve(address(vaultComposer), TOKENS_TO_SEND);
        vaultComposer.redeemAndSend{ value: fee.nativeFee }(TOKENS_TO_SEND, sendParam, userA);
        vm.stopPrank();

        assertEq(vault_arb.totalSupply(), 0, "redeem burns the share tokens");
        assertEq(assetToken_arb.balanceOf(userA), 0);
        assertEq(assetOFT_eth.balanceOf(userA), 0);

        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(assetOFT_eth.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(assetToken_arb.balanceOf(userA), 0);
        assertEq(vault_arb.balanceOf(userA), 0);
    }
}
