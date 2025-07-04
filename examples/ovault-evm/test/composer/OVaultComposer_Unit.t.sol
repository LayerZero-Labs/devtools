// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IOVaultComposer, FailedState } from "@layerzerolabs/ovault-evm/contracts/interfaces/IOVaultComposer.sol";
import { OVaultComposer } from "@layerzerolabs/ovault-evm/contracts/OVaultComposer.sol";
import { OVaultComposerBaseTest } from "./OVaultComposer_Base.t.sol";

import { console } from "forge-std/console.sol";
contract OVaultComposerUnitTest is OVaultComposerBaseTest {
    using OptionsBuilder for bytes;

    function setUp() public virtual override {
        super.setUp();
    }

    function test_deployment() public view {
        assertEq(address(OVaultComposerArb.OVAULT()), address(oVault_arb));
        assertEq(OVaultComposerArb.SHARE_OFT(), address(shareOFT_arb));
        assertEq(OVaultComposerArb.ASSET_OFT(), address(assetOFT_arb));
    }

    function test_onlyEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.OnlyEndpoint.selector, address(this)));
        OVaultComposerArb.lzCompose(address(assetOFT_arb), _randomGUID(), "", userA, "");
    }

    function test_onlyOFT(address _oft) public {
        vm.assume(_oft != address(assetOFT_arb) && _oft != address(shareOFT_arb));

        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.OnlyOFT.selector, _oft));
        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(_oft, _randomGUID(), "", arbExecutor, "");
    }

    function test_lzCompose_pass() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userA),
            TOKENS_TO_SEND,
            0,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetOFT_arb));
        emit IERC20.Transfer(address(OVaultComposerArb), address(oVault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC20.Transfer(address(0), address(OVaultComposerArb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC4626.Deposit(address(OVaultComposerArb), address(OVaultComposerArb), TOKENS_TO_SEND, TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Sent(guid, address(shareOFT_arb));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), oVault_arb.balanceOf(address(shareOFT_arb)), TOKENS_TO_SEND);
    }

    function test_lzCompose_pass_on_hub() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(
            OVaultComposerArb.HUB_EID(),
            addressToBytes32(userA),
            TOKENS_TO_SEND,
            0,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetOFT_arb));
        emit IERC20.Transfer(address(OVaultComposerArb), address(oVault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC20.Transfer(address(0), address(OVaultComposerArb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC4626.Deposit(address(OVaultComposerArb), address(OVaultComposerArb), TOKENS_TO_SEND, TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.SentOnHub(userA, address(shareOFT_arb), TOKENS_TO_SEND);

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), oVault_arb.balanceOf(address(userA)), TOKENS_TO_SEND);
    }

    function test_lzCompose_fail_invalid_payload_and_can_refund() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);
        uint256 userBBalanceEth = assetOFT_arb.balanceOf(userB);

        bytes memory invalidPayload = bytes("0x1234");

        bytes memory composeMsg = _createComposePayload(ETH_EID, invalidPayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.DecodeFailed(guid, address(assetOFT_arb), invalidPayload);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));

        (
            address oft,
            SendParam memory sendParam,
            address refundOFT,
            SendParam memory refundSendParam
        ) = OVaultComposerArb.failedMessages(guid);

        assertEq(refundOFT, address(assetOFT_arb), "refundOFT should be assetOFT_arb");
        assertEq(oft, address(0), "retry oft should be 0 - not possible");
        assertEq(refundSendParam.dstEid, ETH_EID, "refund dstEid should be ETH_EID");
        assertEq(refundSendParam.to, addressToBytes32(userA), "refund to should be userA");
        assertEq(refundSendParam.amountLD, TOKENS_TO_SEND, "refund amountLD should be TOKENS_TO_SEND");
        assertEq(refundSendParam.minAmountLD, 0, "refund minAmountLD should be 0");
        assertEq(refundSendParam.extraOptions, "", "refund extraOptions should be empty");

        assertEmpty(sendParam);

        OVaultComposerArb.refund{ value: 1 ether }(guid, OPTIONS_LZRECEIVE_2M);

        verifyPackets(ETH_EID, address(assetOFT_arb));
        assertEq(assetOFT_arb.balanceOf(userA), userBBalanceEth, "userA should have the same asset amount on Ethereum");
    }

    function test_lzCompose_quoteSend_fail_and_can_refund() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        uint256 userBBalanceEth = assetOFT_arb.balanceOf(userB);

        SendParam memory internalSendParam = SendParam(
            BAD_EID,
            addressToBytes32(userB),
            TOKENS_TO_SEND,
            0,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composePayload = abi.encode(internalSendParam);
        bytes memory composeMsg = _createComposePayload(ETH_EID, composePayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.NoPeer(guid, address(shareOFT_arb), BAD_EID);

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        (
            address oft,
            SendParam memory sendParam,
            address refundOFT,
            SendParam memory refundSendParam
        ) = OVaultComposerArb.failedMessages(guid);

        assertEq(refundOFT, address(assetOFT_arb), "refundOFT should be assetOFT_arb");
        assertEq(oft, address(0), "retry oft should be 0 - not possible");

        assertEq(refundSendParam.dstEid, ETH_EID, "refund dstEid should be ETH_EID");
        assertEq(refundSendParam.to, addressToBytes32(userA), "refund to should be userA");
        assertEq(refundSendParam.amountLD, TOKENS_TO_SEND, "refund amountLD should be TOKENS_TO_SEND");
        assertEq(refundSendParam.minAmountLD, 0, "refund minAmountLD should be 0");
        assertEq(refundSendParam.extraOptions, bytes(""), "refund extraOptions should be empty");

        SendParam memory expectedSendParam = internalSendParam;
        expectedSendParam.amountLD = 0;

        assertEq(sendParam, expectedSendParam);

        OVaultComposerArb.refund{ value: 1 ether }(guid, OPTIONS_LZRECEIVE_2M);

        verifyPackets(ETH_EID, address(assetOFT_arb));
        assertEq(assetOFT_arb.balanceOf(userA), userBBalanceEth, "userA should have the same asset amount on Ethereum");
    }

    function test_lzCompose_slippage_on_target_token_and_can_retry_with_swap_or_refund() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userB),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND + 1,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composePayload = abi.encode(internalSendParam);
        bytes memory composeMsg = _createComposePayload(ETH_EID, composePayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        bytes memory errMsg = abi.encodeWithSelector(
            IOVaultComposer.NotEnoughTargetTokens.selector,
            TOKENS_TO_SEND,
            TOKENS_TO_SEND + 1
        );
        emit IOVaultComposer.OVaultError(guid, address(shareOFT_arb), errMsg);

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRetryWithSwapOrRefund));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        (
            address oft,
            SendParam memory sendParam,
            address refundOFT,
            SendParam memory refundSendParam
        ) = OVaultComposerArb.failedMessages(guid);

        assertEq(refundOFT, address(assetOFT_arb), "refundOFT should be assetOFT_arb");
        assertEq(oft, address(shareOFT_arb), "retry oft should be shareOFT_arb");

        assertEq(refundSendParam.dstEid, ETH_EID, "refund dstEid should be ETH_EID");
        assertEq(refundSendParam.to, addressToBytes32(userA), "refund to should be userA");
        assertEq(refundSendParam.amountLD, TOKENS_TO_SEND, "refund amountLD should be TOKENS_TO_SEND");
        assertEq(refundSendParam.minAmountLD, 0, "refund minAmountLD should be TOKENS_TO_SEND + 1");
        assertEq(refundSendParam.extraOptions, bytes(""), "refund extraOptions should be empty");

        SendParam memory expectedSendParam = internalSendParam;
        expectedSendParam.amountLD = 0;

        assertEq(sendParam, expectedSendParam);
    }

    function test_lzCompose_fail_insufficient_fee_amount_and_can_retry() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        uint256 userBBalancePolygon = shareOFT_pol.balanceOf(userB);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userB),
            TOKENS_TO_SEND,
            0,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetOFT_arb));
        emit IERC20.Transfer(address(OVaultComposerArb), address(oVault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC20.Transfer(address(0), address(OVaultComposerArb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC4626.Deposit(address(OVaultComposerArb), address(OVaultComposerArb), TOKENS_TO_SEND, TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.SendFailed(guid, address(shareOFT_arb));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), oVault_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);

        (address oft, SendParam memory sendParam, address refundOFT, ) = OVaultComposerArb.failedMessages(guid);

        assertEq(refundOFT, address(0), "refundOFT should be 0 - not possible");
        assertEq(oft, address(shareOFT_arb), "retry oft should be shareOFT_arb");
        assertEq(sendParam.dstEid, POL_EID, "retry dstEid should be POL_EID");
        assertEq(sendParam.to, addressToBytes32(userB), "retry to should be userB");
        assertEq(sendParam.amountLD, TOKENS_TO_SEND, "retry amountLD should be TOKENS_TO_SEND");
        assertEq(sendParam.minAmountLD, 0, "retry minAmountLD should be 0");
        assertEq(sendParam.extraOptions, OPTIONS_LZRECEIVE_2M, "retry extraOptions should be OPTIONS_LZRECEIVE_2M");

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertEq(shareOFT_pol.balanceOf(userB), userBBalancePolygon, "userB should have the same shares on Polygon");

        OVaultComposerArb.retry{ value: 1 ether }(guid, OPTIONS_LZRECEIVE_2M);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), oVault_arb.balanceOf(address(shareOFT_arb)), TOKENS_TO_SEND);

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertGt(shareOFT_pol.balanceOf(userB), userBBalancePolygon, "userB should have more shares on Polygon");
    }

    function test_lzCompose_slippage_retry_with_swap() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        (uint256 targetAmount, ) = _removeDustWithOffset(TOKENS_TO_SEND * 2, -1);

        uint256 userBBalancePolygon = shareOFT_pol.balanceOf(userB);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userB),
            TOKENS_TO_SEND,
            targetAmount,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composePayload = abi.encode(internalSendParam);
        bytes memory composeMsg = _createComposePayload(ETH_EID, composePayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        bytes memory errMsg = abi.encodeWithSelector(
            IOVaultComposer.NotEnoughTargetTokens.selector,
            TOKENS_TO_SEND,
            targetAmount
        );
        emit IOVaultComposer.OVaultError(guid, address(shareOFT_arb), errMsg);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRetryWithSwapOrRefund));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertEq(shareOFT_pol.balanceOf(userB), userBBalancePolygon, "userB should have the same shares on Polygon");

        (uint256 mintAssets, uint256 mintShares) = _setTradeRatioAssetToShare(1, 2);
        OVaultComposerArb.retryWithSwap{ value: 1 ether }(guid, OPTIONS_LZRECEIVE_2M);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), mintAssets + TOKENS_TO_SEND);

        (uint256 _ovaultTotalSupply, ) = _removeDust(oVault_arb.totalSupply());
        assertEq(
            _ovaultTotalSupply,
            oVault_arb.balanceOf(address(0xbeef)) + oVault_arb.balanceOf(address(shareOFT_arb)),
            mintShares + targetAmount
        );

        verifyPackets(POL_EID, address(shareOFT_pol));
        assertGt(shareOFT_pol.balanceOf(userB), userBBalancePolygon, "userB should have more shares on Polygon");
    }

    function test_lzCompose_slippage_retry_with_swap_failed_retains_transaction() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        (uint256 targetAmount, ) = _removeDustWithOffset(TOKENS_TO_SEND * 2, -1);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userB),
            TOKENS_TO_SEND,
            targetAmount,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composePayload = abi.encode(internalSendParam);
        bytes memory composeMsg = _createComposePayload(ETH_EID, composePayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        bytes memory errMsg = abi.encodeWithSelector(
            IOVaultComposer.NotEnoughTargetTokens.selector,
            TOKENS_TO_SEND,
            targetAmount
        );
        emit IOVaultComposer.OVaultError(guid, address(shareOFT_arb), errMsg);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRetryWithSwapOrRefund));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        vm.expectRevert();
        OVaultComposerArb.retryWithSwap{ value: 1 ether }(guid, OPTIONS_LZRECEIVE_2M);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRetryWithSwapOrRefund));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(oVault_arb.totalSupply(), 0);

        (uint256 mintAssets, uint256 mintShares) = _setTradeRatioAssetToShare(1, 2);

        OVaultComposerArb.retryWithSwap{ value: 1 ether }(guid, OPTIONS_LZRECEIVE_2M);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), mintAssets + TOKENS_TO_SEND);

        (uint256 _ovaultTotalSupply, ) = _removeDust(oVault_arb.totalSupply());

        assertEq(
            _ovaultTotalSupply,
            oVault_arb.balanceOf(address(0xbeef)) + oVault_arb.balanceOf(address(shareOFT_arb)),
            mintShares + targetAmount
        );
    }
}
