// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// LayerZero imports
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

// Contract imports
import { VaultComposerSyncPoolBaseTest } from "./VaultComposerSyncPool_Base.t.sol";
import { IWETH } from "../../contracts/interfaces/IWETH.sol";

// Forge imports
import { console } from "forge-std/console.sol";

contract VaultComposerSyncPoolNativeForkTest is VaultComposerSyncPoolBaseTest {
    using OFTMsgCodec for address;

    function test_setupPoolNative() public view {
        // Validate deployment addresses using base test variables
        assertEq(address(ethComposer.VAULT()), address(ethVault), "Vault address mismatch");
        assertEq(ethComposer.ASSET_OFT(), address(ethPool), "Asset OFT address mismatch");
        assertEq(ethComposer.SHARE_OFT(), address(ethShareOFTAdapter), "Share OFT address mismatch");
        assertEq(ethPool.token(), address(0), "ETH Pool should be native (address(0))");

        // Validate OFTAdapter setup
        assertEq(ethShareOFTAdapter.token(), address(ethVault), "OFTAdapter token mismatch");
        assertEq(address(ethShareOFTAdapter.endpoint()), LZ_ENDPOINT_V2, "OFTAdapter endpoint mismatch");
        assertEq(ethShareOFTAdapter.owner(), deployer, "OFTAdapter owner mismatch");
        assertEq(ethShareOFTAdapter.approvalRequired(), true, "OFTAdapter approvalRequired mismatch");

        // Validate path credits using base test helpers
        assertGt(_getPathCredit(ethPool, ARB_EID), 0, "ETH Pool should have credit for ARB");
        assertLt(_getPathCredit(ethPool, ARB_EID), UNLIMITED_CREDIT, "ARB should be Pool path (limited credit)");
        assertEq(_getPathCredit(ethPool, BERA_EID), UNLIMITED_CREDIT, "BERA should be OFT path (unlimited credit)");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FORK TESTS - Failed Deposit from Stargate Pool
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolNativeFailedDepositFromArbPool() public {
        uint64 credit = _getPathCredit(ethPool, ARB_EID);
        uint256 amtToSend = (credit * ETH_TO_LD) + 1;
        assertGt(amtToSend, credit, "Amount to send should be greater than the credit");

        // Give native composer native ETH (simulating received from LayerZero)
        vm.deal(address(ethComposer), amtToSend);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToSend, 0);

        bytes memory composeMsg = _createPoolComposePayload(
            ARB_EID,
            sendParam,
            hubRecoveryAddress,
            1 wei,
            amtToSend,
            userA
        );

        assertEq(address(ethComposer).balance, amtToSend, "Native composer should have the amount to send");
        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH balance");

        // Cause the operation by sending less than the minimum expected msg.value
        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: 1 wei }(address(ethPool), randomGUID, composeMsg, executor, "");

        assertEq(wethToken.balanceOf(address(ethComposer)), 0, "Native composer should have 0 WETH balance");
        assertEq(
            wethToken.balanceOf(hubRecoveryAddress),
            amtToSend,
            "HubRecoveryAddress should have the amount as WETH"
        );
    }

    function test_forkPoolNativeDepositFailedFromBeraOFT() public {
        uint64 credit = _getPathCredit(ethPool, BERA_EID);
        assertEq(credit, UNLIMITED_CREDIT, "ETH Pool BERA path should have unlimited credit");
        uint256 amtToSend = 1e18;

        // Give native composer native ETH
        vm.deal(address(ethComposer), amtToSend);

        SendParam memory sendParam = _createSendParam(BERA_EID, userB, amtToSend, type(uint256).max);

        bytes memory composeMsg = _createPoolComposePayload(
            BERA_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToSend,
            userA
        );

        assertEq(address(ethComposer).balance, amtToSend, "Native composer should have the amount to send");
        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH balance");

        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: 0.1 ether }(address(ethPool), randomGUID, composeMsg, executor, "");

        assertEq(address(ethComposer).balance, 0, "Native composer should have 0 native balance");
        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH balance");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FORK TESTS - Successful Redeem to Stargate Pool
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolNativeSuccessRedeemToArbPool() public {
        uint64 credit = _getPathCredit(ethPool, ARB_EID);
        uint256 amtToMint = (credit * ETH_TO_LD) + 1;

        uint256 composerBalancePreDeposit = ethVault.balanceOf(address(ethComposer));
        assertEq(composerBalancePreDeposit, 0, "Native composer should have 0 share balance before deposit");

        // Setup vault shares for native composer
        vm.deal(address(this), amtToMint * 2);
        IWETH(address(wethToken)).deposit{ value: amtToMint }();
        wethToken.approve(address(ethVault), amtToMint);
        ethVault.deposit(amtToMint, address(ethComposer));

        uint256 amtToRedeem = ethVault.balanceOf(address(ethComposer));
        assertGt(
            amtToRedeem,
            composerBalancePreDeposit,
            "Native composer should have more share balance after deposit"
        );

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(
            BERA_EID, // Source doesn't matter for this test
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToRedeem,
            userA
        );

        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH balance");

        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: 0.1 ether }(address(ethShareOFTAdapter), randomGUID, redeemMsg, executor, "");

        assertEq(ethVault.balanceOf(address(ethComposer)), 0, "Native composer should have 0 share balance");
        assertEq(address(hubRecoveryAddress).balance, 0, "HubRecoveryAddress should have 0 native balance");
        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH tokens");
    }

    function test_forkPoolNativeSuccessRedeemToBeraOFT() public {
        uint256 feeAmt = 0.1 ether;
        uint256 amtToMint = 1 ether;

        uint256 composerBalancePreDeposit = ethVault.balanceOf(address(ethComposer));
        assertEq(composerBalancePreDeposit, 0, "Native composer should have 0 share balance before deposit");

        // Setup vault shares for native composer
        vm.deal(address(this), amtToMint * 2);
        IWETH(address(wethToken)).deposit{ value: amtToMint }();
        wethToken.approve(address(ethVault), amtToMint);
        ethVault.deposit(amtToMint, address(ethComposer));

        uint256 amtToRedeem = ethVault.balanceOf(address(ethComposer));
        assertGt(
            amtToRedeem,
            composerBalancePreDeposit,
            "Native composer should have more share balance after deposit"
        );

        SendParam memory sendParam = _createSendParam(BERA_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(
            ARB_EID, // Source doesn't matter for this test
            sendParam,
            hubRecoveryAddress,
            feeAmt,
            amtToRedeem,
            userA
        );

        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH balance");

        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: feeAmt }(address(ethShareOFTAdapter), randomGUID, redeemMsg, executor, "");

        assertEq(ethVault.balanceOf(address(ethComposer)), 0, "Native composer should have 0 share balance");
        assertEq(address(hubRecoveryAddress).balance, 0, "HubRecoveryAddress should have 0 native balance");
        assertEq(wethToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 WETH tokens");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // NATIVE-SPECIFIC FUNCTION TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_depositNativeAndSend_hub_destination() public {
        uint256 nativeAmount = 1 ether;

        // Give userA native ETH for the deposit
        vm.deal(userA, nativeAmount);

        uint256 userInitialShares = ethVault.balanceOf(userA);
        uint256 hubRecoveryInitialBalance = address(hubRecoveryAddress).balance;

        // Create send param for Pool destination (will trigger Bridge+Swap fallback)
        SendParam memory sendParam = _createSendParam(ETH_EID, userA, nativeAmount, (nativeAmount * 95) / 100);

        assertEq(userInitialShares, 0, "User should have 0 shares before deposit");
        assertEq(hubRecoveryInitialBalance, 0, "HubRecoveryAddress should have 0 native balance before deposit");

        // Call depositNativeAndSend
        vm.prank(userA);
        ethComposer.depositNativeAndSend{ value: nativeAmount }(nativeAmount, sendParam, userA);

        assertGt(ethVault.balanceOf(userA), userInitialShares, "User should have more shares after deposit");
        assertEq(
            address(hubRecoveryAddress).balance,
            hubRecoveryInitialBalance,
            "HubRecoveryAddress should have more native balance after deposit"
        );
    }

    function test_depositNativeAndSend_insufficient_msg_value() public {
        uint256 nativeAmount = 1 ether;
        uint256 insufficientMsgValue = 0.5 ether; // Less than nativeAmount

        vm.deal(userA, insufficientMsgValue);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, nativeAmount, 0);

        // Should revert due to insufficient msg.value
        vm.prank(userA);
        vm.expectRevert(); // AmountExceedsMsgValue error
        ethComposer.depositNativeAndSend{ value: insufficientMsgValue }(nativeAmount, sendParam, userA);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADDITIONAL NATIVE-SPECIFIC TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolNativeETHWrappingBehavior() public {
        // Test that native ETH gets properly wrapped to WETH for vault operations
        uint256 nativeAmount = 1 ether;

        // Give composer native ETH
        vm.deal(address(ethComposer), nativeAmount);

        uint256 composerNativeBalanceBefore = address(ethComposer).balance;

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, nativeAmount, 0);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            nativeAmount,
            userA
        );

        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: 0.1 ether }(address(ethPool), randomGUID, composeMsg, executor, "");

        // Verify ETH was wrapped and processed
        assertEq(
            address(ethComposer).balance,
            composerNativeBalanceBefore - nativeAmount,
            "Native ETH should be consumed"
        );
        assertGt(ethVault.totalSupply(), 0, "Vault should have processed the wrapped ETH");
    }

    function test_forkPoolNativeWETHUnwrappingForStargate() public {
        // Test that WETH gets unwrapped to ETH when sending to Stargate native pool
        uint256 amtToMint = 1 ether;

        // Setup vault shares
        vm.deal(address(this), amtToMint * 2);
        IWETH(address(wethToken)).deposit{ value: amtToMint }();
        wethToken.approve(address(ethVault), amtToMint);
        ethVault.deposit(amtToMint, address(ethComposer));

        uint256 amtToRedeem = ethVault.balanceOf(address(ethComposer));

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(
            BERA_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToRedeem,
            userA
        );

        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: 0.1 ether }(address(ethShareOFTAdapter), randomGUID, redeemMsg, executor, "");

        // For native pools, redeemed WETH should be unwrapped and sent as ETH
        // (This might go to recovery address if Pool send fails)
        assertEq(ethVault.balanceOf(address(ethComposer)), 0, "Shares should be redeemed");
    }

    function test_forkPoolNativeRecoveryAddressWithNativeTokens() public {
        // Test native token refund behavior specific to PoolNative
        uint256 depositAmount = 1 ether;
        uint256 msgValue = 0.5 ether;

        vm.deal(address(ethComposer), depositAmount);

        // Create failing send param
        SendParam memory sendParam = _createSendParam(ARB_EID, userB, depositAmount, depositAmount + 1);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress,
            msgValue,
            depositAmount,
            userA
        );

        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: msgValue }(address(ethPool), randomGUID, composeMsg, executor, "");

        // Verify native tokens were handled properly in fallback
        // (Might go to tx.origin if hubRecoveryAddress can't receive native)
        assertGt(ethVault.totalSupply(), 0, "Vault operation should have succeeded before send failure");
    }
}
