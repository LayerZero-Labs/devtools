// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IOVaultComposer, FailedState, FailedMessage } from "../../contracts/interfaces/IOVaultComposer.sol";
import { MockOVaultComposer } from "../mocks/MockComposer.sol";
import { OVaultComposerBaseTest } from "./OVaultComposer_Base.t.sol";

import { console } from "forge-std/console.sol";

contract OVaultComposerRefundTest is OVaultComposerBaseTest {
    bytes32 guid;
    SendParam refundSendParam;
    uint256 ethInitialBalance;

    function setUp() public virtual override {
        super.setUp();
        guid = _randomGUID();
        refundSendParam = _createRefundSendParam(TOKENS_TO_SEND);
        ethInitialBalance = assetOFT_eth.balanceOf(address(userA));
    }

    function test_cannot_retry() public {
        OVaultComposerArb.setFailedMessageRefund{ value: msgValueToPass }(guid, address(assetOFT_arb), refundSendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));

        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.CanNotRetry.selector, guid));
        OVaultComposerArb.retry(guid, false);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));
    }

    function test_can_refund() public {
        OVaultComposerArb.setFailedMessageRefund{ value: msgValueToPass }(guid, address(assetOFT_arb), refundSendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Refunded(guid, address(assetOFT_arb));
        OVaultComposerArb.refund(guid);
        verifyPackets(ETH_EID, address(assetOFT_eth));

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));
        assertGt(assetOFT_eth.balanceOf(address(userA)), ethInitialBalance);
    }

    function test_can_refund_with_supplement_msgValue() public {
        OVaultComposerArb.setFailedMessageRefund{ value: msgValueToFail }(guid, address(assetOFT_arb), refundSendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));

        vm.expectRevert();
        OVaultComposerArb.refund(guid);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRefund));

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Refunded(guid, address(assetOFT_arb));
        OVaultComposerArb.refund{ value: msgValueToPass - msgValueToFail }(guid);
        verifyPackets(ETH_EID, address(assetOFT_eth));

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));
        assertGt(assetOFT_eth.balanceOf(address(userA)), ethInitialBalance);
    }
}

contract OVaultComposerRetryTest is OVaultComposerBaseTest {
    bytes32 guid;
    SendParam sendParam;
    uint256 polygonInitialBalance;

    function setUp() public virtual override {
        super.setUp();
        guid = _randomGUID();
        sendParam = _createSendParam(TOKENS_TO_SEND, false);
        polygonInitialBalance = oVault_arb.balanceOf(userB);
    }

    function test_cannot_refund() public {
        OVaultComposerArb.setFailedMessageRetry{ value: msgValueToPass }(guid, address(shareOFT_arb), sendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.CanNotRefund.selector, guid));
        OVaultComposerArb.refund(guid);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));
    }

    function test_can_retry_without_removeExtraOptions() public {
        OVaultComposerArb.setFailedMessageRetry{ value: msgValueToPass }(guid, address(shareOFT_arb), sendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Retried(guid, address(shareOFT_arb));
        OVaultComposerArb.retry(guid, false);

        verifyPackets(POL_EID, address(shareOFT_pol));

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));
        assertGt(shareOFT_pol.balanceOf(userB), polygonInitialBalance);
    }

    function test_cannot_retry_with_removeExtraOptions_and_no_msgValue() public {
        OVaultComposerArb.setFailedMessageRetry{ value: msgValueToPass }(guid, address(shareOFT_arb), sendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        vm.expectRevert();
        OVaultComposerArb.retry(guid, true);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));
    }

    function test_refundAddress_receives_stored_msgValue_when_retry_with_removeExtraOptions() public {
        OVaultComposerArb.setFailedMessageRetry{ value: 1 ether }(guid, address(shareOFT_arb), sendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        uint256 refundAddressInitialBalance = refundOverpayAddress.balance;

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Retried(guid, address(shareOFT_arb));
        OVaultComposerArb.retry{ value: msgValueToPass }(guid, true);

        verifyPackets(POL_EID, address(shareOFT_pol));

        assertEq(refundOverpayAddress.balance - refundAddressInitialBalance, 1 ether);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));
        assertGt(shareOFT_pol.balanceOf(userB), polygonInitialBalance);
    }

    function test_can_retry_with_supplement_msgValue() public {
        OVaultComposerArb.setFailedMessageRetry{ value: msgValueToFail }(guid, address(shareOFT_arb), sendParam);
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        vm.expectRevert();
        OVaultComposerArb.retry(guid, false);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Retried(guid, address(shareOFT_arb));
        OVaultComposerArb.retry{ value: msgValueToPass - msgValueToFail }(guid, false);

        verifyPackets(POL_EID, address(shareOFT_pol));

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));
        assertGt(shareOFT_pol.balanceOf(userB), polygonInitialBalance);
    }
}

contract OVaultComposerRetryWithSwapTest is OVaultComposerBaseTest {
    bytes32 guid;
    SendParam sendParam;
    SendParam refundSendParam;

    uint256 ethInitialBalance;
    uint256 polygonInitialBalance;

    function setUp() public virtual override {
        super.setUp();
        guid = _randomGUID();
        sendParam = _createSendParam(TOKENS_TO_SEND, true);
        refundSendParam = _createRefundSendParam(TOKENS_TO_SEND);

        ethInitialBalance = assetOFT_eth.balanceOf(address(userA));
        polygonInitialBalance = oVault_arb.balanceOf(userB);
    }

    function test_cannot_retry() public {
        OVaultComposerArb.setFailedMessageRetryWithSwap{ value: msgValueToPass }(
            guid,
            address(shareOFT_arb),
            sendParam,
            address(assetOFT_arb),
            refundSendParam
        );
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRefundOrRetryWithSwap));

        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.CanNotRetry.selector, guid));
        OVaultComposerArb.retry(guid, false);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRefundOrRetryWithSwap));
    }

    function test_can_refund() public {
        OVaultComposerArb.setFailedMessageRetryWithSwap{ value: msgValueToPass }(
            guid,
            address(shareOFT_arb),
            sendParam,
            address(assetOFT_arb),
            refundSendParam
        );

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Refunded(guid, address(assetOFT_arb));
        OVaultComposerArb.refund(guid);

        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.NotFound));
        assertGt(assetOFT_eth.balanceOf(address(userA)), ethInitialBalance);
    }

    function test_cannot_swap_with_msgValue_when_skip_retry_is_true() public {
        OVaultComposerArb.setFailedMessageRetryWithSwap(
            guid,
            address(shareOFT_arb),
            sendParam,
            address(assetOFT_arb),
            refundSendParam
        );

        uint256 ovaultShareBalance = oVault_arb.balanceOf(address(OVaultComposerArb));

        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.NoMsgValueWhenSkippingRetry.selector));
        OVaultComposerArb.retryWithSwap{ value: msgValueToPass }(guid, true);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRefundOrRetryWithSwap));
        assertEq(oVault_arb.balanceOf(address(OVaultComposerArb)), ovaultShareBalance);
    }

    function test_swapping_does_not_need_msgValue() public {
        OVaultComposerArb.setFailedMessageRetryWithSwap(
            guid,
            address(shareOFT_arb),
            sendParam,
            address(assetOFT_arb),
            refundSendParam
        );

        uint256 ovaultShareBalance = oVault_arb.balanceOf(address(OVaultComposerArb));

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.SwappedTokens(guid);
        OVaultComposerArb.retryWithSwap(guid, true);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));
        assertGt(oVault_arb.balanceOf(address(OVaultComposerArb)), ovaultShareBalance);
    }

    function test_complete_revert_when_slippage_check_fails() public {
        sendParam.minAmountLD = TOKENS_TO_SEND + 1;

        OVaultComposerArb.setFailedMessageRetryWithSwap(
            guid,
            address(shareOFT_arb),
            sendParam,
            address(assetOFT_arb),
            refundSendParam
        );

        uint256 ovaultShareBalance = oVault_arb.balanceOf(address(OVaultComposerArb));

        vm.expectRevert(
            abi.encodeWithSelector(
                IOVaultComposer.NotEnoughTargetTokens.selector,
                sendParam.amountLD,
                sendParam.minAmountLD
            )
        );
        OVaultComposerArb.retryWithSwap(guid, true);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanRefundOrRetryWithSwap));
        assertEq(oVault_arb.balanceOf(address(OVaultComposerArb)), ovaultShareBalance);
    }

    function test_swap_and_failed_retry_updates_msgValue() public {
        OVaultComposerArb.setFailedMessageRetryWithSwap{ value: msgValueToFail }(
            guid,
            address(shareOFT_arb),
            sendParam,
            address(assetOFT_arb),
            refundSendParam
        );

        (, , , , uint256 msgValue) = OVaultComposerArb.failedMessages(guid);

        assertEq(msgValue, address(OVaultComposerArb).balance, msgValueToFail);

        uint256 ovaultShareBalance = oVault_arb.balanceOf(address(OVaultComposerArb));

        OVaultComposerArb.retryWithSwap{ value: 1 wei }(guid, false);

        assertEq(uint256(OVaultComposerArb.failedGuidState(guid)), uint256(FailedState.CanOnlyRetry));
        assertGt(oVault_arb.balanceOf(address(OVaultComposerArb)), ovaultShareBalance);

        (, , , , uint256 newMsgValue) = OVaultComposerArb.failedMessages(guid);

        assertEq(newMsgValue, address(OVaultComposerArb).balance, msgValueToFail + 1 wei);
    }
}
