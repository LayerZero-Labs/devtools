// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IOVaultComposer, FailedState } from "../../contracts/interfaces/IOVaultComposer.sol";
import { OVaultComposer } from "../../contracts/OVaultComposer.sol";
import { OVaultComposerBaseTest } from "./OVaultComposer_Base.t.sol";

import { console } from "forge-std/console.sol";

contract OVaultComposerProxySendTest is OVaultComposerBaseTest {
    using OptionsBuilder for bytes;

    function setUp() public virtual override {
        super.setUp();
        vm.deal(userA, 100 ether);
    }

    function test_depositSend_target_hub() public {
        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetOFT_arb.mint(address(userA), TOKENS_TO_SEND);

        vm.startPrank(userA);
        assetOFT_arb.approve(address(OVaultComposerArb), TOKENS_TO_SEND);
        OVaultComposerArb.depositSend(sendParam, userA);
        vm.stopPrank();

        assertEq(oVault_arb.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(assetOFT_arb.balanceOf(userA), 0);
    }

    function test_redeemSend_target_hub() public {
        SendParam memory sendParam = SendParam(ARB_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetOFT_arb.mint(address(oVault_arb), TOKENS_TO_SEND);
        oVault_arb.mint(address(userA), TOKENS_TO_SEND);

        vm.startPrank(userA);
        oVault_arb.approve(address(OVaultComposerArb), TOKENS_TO_SEND);
        OVaultComposerArb.redeemSend(sendParam, userA);
        vm.stopPrank();

        assertEq(oVault_arb.balanceOf(userA), 0);
        assertEq(assetOFT_arb.balanceOf(userA), TOKENS_TO_SEND);
    }

    function test_depositSend_target_not_hub() public {
        SendParam memory sendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetOFT_arb.mint(address(userA), TOKENS_TO_SEND);

        MessagingFee memory fee = OVaultComposerArb.quoteDepositSend(sendParam);

        vm.startPrank(userA);
        assetOFT_arb.approve(address(OVaultComposerArb), TOKENS_TO_SEND);
        OVaultComposerArb.depositSend{ value: fee.nativeFee }(sendParam, userA);
        vm.stopPrank();

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), TOKENS_TO_SEND);
        assertEq(shareOFT_pol.balanceOf(userA), 0);

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertEq(shareOFT_pol.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(oVault_arb.balanceOf(userA), 0);
    }

    function test_redeemSend_target_not_hub() public {
        SendParam memory sendParam = SendParam(ETH_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        assetOFT_arb.mint(address(oVault_arb), TOKENS_TO_SEND);
        oVault_arb.mint(address(userA), TOKENS_TO_SEND);

        MessagingFee memory fee = OVaultComposerArb.quoteRedeemSend(sendParam);

        vm.startPrank(userA);
        oVault_arb.approve(address(OVaultComposerArb), TOKENS_TO_SEND);
        OVaultComposerArb.redeemSend{ value: fee.nativeFee }(sendParam, userA);
        vm.stopPrank();

        assertEq(oVault_arb.totalSupply(), 0, "redeem burns the share tokens");
        assertEq(assetOFT_arb.balanceOf(userA), 0);
        assertEq(assetOFT_eth.balanceOf(userA), 0);

        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(assetOFT_eth.balanceOf(userA), TOKENS_TO_SEND);
        assertEq(assetOFT_arb.balanceOf(userA), 0);
        assertEq(oVault_arb.balanceOf(userA), 0);
    }
}
