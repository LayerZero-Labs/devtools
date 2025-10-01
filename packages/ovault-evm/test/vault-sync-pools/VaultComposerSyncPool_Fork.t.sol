// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// OpenZeppelin imports
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

// LayerZero imports
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

// Contract imports
import { VaultComposerSyncPool } from "../../contracts/VaultComposerSyncPool.sol";
import { VaultComposerSyncPoolBaseTest } from "./VaultComposerSyncPool_Base.t.sol";

// Forge imports
import { console } from "forge-std/console.sol";

contract VaultComposerSyncPoolForkTest is VaultComposerSyncPoolBaseTest {
    using OFTMsgCodec for address;

    // Test constants
    uint256 public constant TOKENS_TO_SEND_USDC = 100e6;

    function test_setupPool() public view {
        // Validate deployment addresses using base test variables
        assertEq(address(usdcComposer.VAULT()), address(usdcVault), "Vault address mismatch");
        assertEq(usdcComposer.ASSET_OFT(), address(usdcPool), "Asset OFT address mismatch");
        assertEq(usdcComposer.SHARE_OFT(), address(usdcShareOFTAdapter), "Share OFT address mismatch");
        assertEq(usdcComposer.ASSET_ERC20(), usdcPool.token(), "Asset ERC20 address mismatch");

        // Validate OFTAdapter setup
        assertEq(usdcShareOFTAdapter.token(), address(usdcVault), "OFTAdapter token mismatch");
        assertEq(address(usdcShareOFTAdapter.endpoint()), LZ_ENDPOINT_V2, "OFTAdapter endpoint mismatch");
        assertEq(usdcShareOFTAdapter.owner(), deployer, "OFTAdapter owner mismatch");
        assertEq(usdcShareOFTAdapter.approvalRequired(), true, "OFTAdapter approvalRequired mismatch");

        // Validate path credits using base test helpers
        assertGt(_getPathCredit(usdcPool, ARB_EID), 0, "USDC Pool should have credit for ARB");
        assertLt(_getPathCredit(usdcPool, ARB_EID), UNLIMITED_CREDIT, "ARB should be Pool path (limited credit)");
        assertEq(_getPathCredit(usdcPool, BERA_EID), UNLIMITED_CREDIT, "BERA should be OFT path (unlimited credit)");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FORK TESTS - Failed Deposit from Stargate Pool
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolFailedDepositFromArbPool() public {
        uint64 credit = _getPathCredit(usdcPool, ARB_EID);
        uint256 amtToSend = (credit * 100) + 1;
        assertGt(amtToSend, credit, "Amount to send should be greater than the credit");

        // Setup tokens using base test helper
        _setupTokensForTesting(address(usdcComposer), amtToSend, 0);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToSend, type(uint256).max);

        bytes memory composeMsg = _createPoolComposePayload(
            ARB_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToSend,
            userA
        );

        assertEq(usdcToken.balanceOf(address(usdcComposer)), amtToSend, "Composer should have the amount to send");
        assertEq(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");

        assertEq(usdcToken.balanceOf(address(usdcComposer)), 0, "Composer should have 0 balance");
        assertEq(
            usdcToken.balanceOf(hubRecoveryAddress),
            amtToSend,
            "HubRecoveryAddress should have the amount to send"
        );
    }

    function test_forkPoolDepositFailedFromBeraOFT() public {
        uint64 credit = _getPathCredit(usdcPool, BERA_EID);
        uint256 amtToSend = type(uint32).max;
        assertLt(amtToSend, credit, "Amount to send should be less than the credit");

        // Setup tokens using base test helper
        _setupTokensForTesting(address(usdcComposer), amtToSend, 0);

        SendParam memory sendParam = _createSendParam(BERA_EID, userB, amtToSend, type(uint256).max);

        bytes memory composeMsg = _createPoolComposePayload(
            BERA_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToSend,
            userA
        );

        assertEq(usdcToken.balanceOf(address(usdcComposer)), amtToSend, "Composer should have the amount to send");
        assertEq(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");

        assertEq(usdcToken.balanceOf(address(usdcComposer)), 0, "Composer should have 0 balance");
        assertEq(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 balance");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FORK TESTS - Successful Redeem to Stargate Pool
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolSuccessRedeemToArbPool() public {
        uint64 credit = _getPathCredit(usdcPool, ARB_EID);
        uint256 amtToMint = (credit * ETH_TO_LD) + 1;
        assertGt(amtToMint, credit, "Asset amount to mint should be greater than the credit");

        uint256 composerBalancePreDeposit = usdcVault.balanceOf(address(usdcComposer));
        assertEq(composerBalancePreDeposit, 0, "Composer should have 0 share balance before deposit");

        // Setup vault shares for the composer
        _setupTokensForTesting(address(this), amtToMint, 0);
        usdcToken.approve(address(usdcVault), amtToMint);
        usdcVault.deposit(amtToMint, address(usdcComposer));

        uint256 amtToRedeem = usdcVault.balanceOf(address(usdcComposer));
        assertGt(amtToRedeem, composerBalancePreDeposit, "Composer should have more share balance after deposit");

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(
            BERA_EID, // Source doesn't matter for this test
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToRedeem,
            userA
        );

        assertEq(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 asset balance");

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcShareOFTAdapter), randomGUID, redeemMsg, executor, "");

        assertEq(usdcVault.balanceOf(address(usdcComposer)), 0, "Composer should have 0 share balance");
        assertGt(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have more asset balance");
    }

    function test_forkPoolSuccessRedeemToBeraOFT() public {
        uint256 amtToMint = 1000e6; // 1000 USDC

        uint256 composerBalancePreDeposit = usdcVault.balanceOf(address(usdcComposer));
        assertEq(composerBalancePreDeposit, 0, "Composer should have 0 share balance before deposit");

        // Setup vault shares for the composer
        _setupTokensForTesting(address(this), amtToMint, 0);
        usdcToken.approve(address(usdcVault), amtToMint);
        usdcVault.deposit(amtToMint, address(usdcComposer));

        uint256 amtToRedeem = usdcVault.balanceOf(address(usdcComposer));
        assertGt(amtToRedeem, composerBalancePreDeposit, "Composer should have more share balance after deposit");

        SendParam memory sendParam = _createSendParam(BERA_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(
            ARB_EID, // Source doesn't matter for this test
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            amtToRedeem,
            userA
        );

        assertEq(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 asset balance");

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcShareOFTAdapter), randomGUID, redeemMsg, executor, "");

        assertEq(usdcVault.balanceOf(address(usdcComposer)), 0, "Composer should have 0 share balance");
        assertEq(usdcToken.balanceOf(hubRecoveryAddress), 0, "HubRecoveryAddress should have 0 asset balance");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADDITIONAL POOL-SPECIFIC TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolExcessiveCreditConsumption() public {
        // Test what happens when we try to consume more credit than available
        uint64 availableCredit = _getPathCredit(usdcPool, ARB_EID);
        uint256 excessiveAmount = (availableCredit * ETH_TO_LD) * 2; // Double the available credit

        _setupTokensForTesting(address(usdcComposer), excessiveAmount, 0);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, excessiveAmount, 0);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            excessiveAmount,
            userA
        );

        uint256 hubRecoveryInitialBalance = usdcToken.balanceOf(hubRecoveryAddress);

        // Should trigger Bridge+Swap fallback due to insufficient Pool credit
        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");

        // Verify Bridge+Swap fallback occurred
        assertGt(
            usdcToken.balanceOf(hubRecoveryAddress),
            hubRecoveryInitialBalance,
            "Should fallback to Bridge+Swap when Pool credit insufficient"
        );
    }

    function test_forkPoolZeroAmountHandling() public {
        // Test edge case of zero amount operations
        uint256 zeroAmount = 0;

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, zeroAmount, 0);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress,
            0.1 ether,
            zeroAmount,
            userA
        );

        // Should handle zero amount gracefully
        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");
    }

    function test_forkPoolRecoveryAddressPriority() public {
        // Test that hubRecoveryAddress takes priority over DEFAULT_RECOVERY_ADDRESS
        uint256 depositAmount = 100e6;
        _setupTokensForTesting(address(usdcComposer), depositAmount, 0);

        uint256 hubRecoveryInitialBalance = usdcToken.balanceOf(hubRecoveryAddress);
        uint256 defaultRecoveryInitialBalance = usdcToken.balanceOf(defaultRecoveryAddress);

        // Create failing send param (slippage too high)
        SendParam memory sendParam = _createSendParam(ARB_EID, userB, depositAmount, depositAmount + 1);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress, // Should use this address for refund
            0.1 ether,
            depositAmount,
            userA
        );

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");

        // Verify hubRecoveryAddress was used (priority 1)
        assertGt(
            usdcToken.balanceOf(hubRecoveryAddress),
            hubRecoveryInitialBalance,
            "Hub recovery address should receive refund (priority 1)"
        );

        // Verify DEFAULT_RECOVERY_ADDRESS was NOT used
        assertEq(
            usdcToken.balanceOf(defaultRecoveryAddress),
            defaultRecoveryInitialBalance,
            "Default recovery address should not receive refund when hub address works"
        );
    }
}
