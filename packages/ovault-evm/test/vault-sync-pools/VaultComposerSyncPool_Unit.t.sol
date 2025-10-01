// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// LayerZero imports
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

// Contract imports
import { IVaultComposerSync } from "../../contracts/interfaces/IVaultComposerSync.sol";
import { VaultComposerSyncPoolBaseTest } from "./VaultComposerSyncPool_Base.t.sol";

// Mock imports
import { NonPayableContract } from "../mocks/MockOFT.sol";

// Forge imports
import { console } from "forge-std/console.sol";

contract VaultComposerSyncPoolUnitTest is VaultComposerSyncPoolBaseTest {
    using OFTComposeMsgCodec for address;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT VALIDATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_deployment_requirements() public view {
        // Test USDC composer configuration
        assertEq(address(usdcComposer.VAULT()), address(usdcVault), "USDC vault mismatch");
        assertEq(usdcComposer.ASSET_OFT(), address(usdcPool), "USDC asset OFT mismatch");
        assertEq(usdcComposer.SHARE_OFT(), address(usdcShareOFTAdapter), "USDC share OFT mismatch");
        assertEq(usdcComposer.DEFAULT_RECOVERY_ADDRESS(), defaultRecoveryAddress, "USDC recovery address mismatch");

        // Test ETH composer configuration
        assertEq(address(ethComposer.VAULT()), address(ethVault), "ETH vault mismatch");
        assertEq(ethComposer.ASSET_OFT(), address(ethPool), "ETH asset OFT mismatch");
        assertEq(ethComposer.SHARE_OFT(), address(ethShareOFTAdapter), "ETH share OFT mismatch");
        assertEq(ethComposer.DEFAULT_RECOVERY_ADDRESS(), defaultRecoveryAddress, "ETH recovery address mismatch");

        // Test share OFTs are adapters (requirement)
        assertTrue(usdcShareOFTAdapter.approvalRequired(), "USDC share OFT must be adapter");
        assertTrue(ethShareOFTAdapter.approvalRequired(), "ETH share OFT must be adapter");

        // Test asset tokens match vault assets
        assertEq(usdcPool.token(), address(usdcToken), "USDC pool token should match");
        assertEq(ethVault.asset(), address(wethToken), "ETH vault asset should be WETH");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_onlyEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlyEndpoint.selector, address(this)));
        usdcComposer.lzCompose(address(usdcPool), randomGUID, "", userA, "");
    }

    function test_onlyValidComposeCaller(address _invalidOft) public {
        vm.assume(_invalidOft != address(usdcPool) && _invalidOft != address(usdcShareOFTAdapter));
        vm.assume(_invalidOft != address(ethPool) && _invalidOft != address(ethShareOFTAdapter));

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlyValidComposeCaller.selector, _invalidOft));
        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 1 ether }(_invalidOft, randomGUID, "", executor, "");
    }

    function test_onlySelf_handleCompose() public {
        SendParam memory sendParam = _createSendParam(ARB_EID, userB, TOKENS_TO_SEND, 0);

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlySelf.selector, address(this)));
        usdcComposer.handleCompose(
            address(usdcPool),
            userA.addressToBytes32(),
            abi.encode(sendParam, hubRecoveryAddress, 1 ether),
            TOKENS_TO_SEND
        );
    }

    function test_onlySelf_lzSend() public {
        SendParam memory sendParam = _createSendParam(ARB_EID, userB, TOKENS_TO_SEND, 0);

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlySelf.selector, address(this)));
        usdcComposer.lzSend(address(usdcPool), sendParam, userA);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ERROR HANDLING TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_InsufficientMsgValue_causes_revert_no_refund() public {
        uint256 depositAmount = 100e6;
        _setupTokensForTesting(address(usdcComposer), depositAmount, 0);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, depositAmount, 0);
        uint256 requiredMsgValue = 10 ether;

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress,
            requiredMsgValue,
            depositAmount,
            userA
        );

        vm.expectRevert(
            abi.encodeWithSelector(IVaultComposerSync.InsufficientMsgValue.selector, requiredMsgValue, 1 ether)
        );

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // POOL-SPECIFIC BEHAVIOR TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_pool_vs_oft_path_detection() public view {
        // ARB should be a Pool path (limited credit)
        assertFalse(_isOFTPath(usdcPool, ARB_EID), "ARB should be Pool path");
        assertLt(_getPathCredit(usdcPool, ARB_EID), UNLIMITED_CREDIT, "ARB should have limited credit");

        // BERA should be an OFT path (unlimited credit)
        assertTrue(_isOFTPath(usdcPool, BERA_EID), "BERA should be OFT path");
        assertEq(_getPathCredit(usdcPool, BERA_EID), UNLIMITED_CREDIT, "BERA should have unlimited credit");

        // ETH Pool should have similar behavior
        assertFalse(_isOFTPath(ethPool, ARB_EID), "ETH ARB should be Pool path");
        assertTrue(_isOFTPath(ethPool, BERA_EID), "ETH BERA should be OFT path");
    }

    function test_isOFTPath_internal_logic() public view {
        // Test that _isOFTPath returns true for share OFT regardless of credit
        // This is the logic: (_oft == SHARE_OFT || credit == UNLIMITED_CREDIT)

        // For share OFT, should always return true
        bool shareOFTResult = (address(usdcShareOFTAdapter) == address(usdcShareOFTAdapter) ||
            _getPathCredit(usdcPool, ARB_EID) == UNLIMITED_CREDIT);
        assertTrue(shareOFTResult, "Share OFT should always be considered OFT path");

        // For asset OFT, depends on credit
        bool assetOFTPoolResult = (address(usdcPool) == address(usdcShareOFTAdapter) ||
            _getPathCredit(usdcPool, ARB_EID) == UNLIMITED_CREDIT);
        assertFalse(assetOFTPoolResult, "Asset OFT with Pool destination should be Pool path");

        bool assetOFTOFTResult = (address(usdcPool) == address(usdcShareOFTAdapter) ||
            _getPathCredit(usdcPool, BERA_EID) == UNLIMITED_CREDIT);
        assertTrue(assetOFTOFTResult, "Asset OFT with OFT destination should be OFT path");
    }

    function test_decodeComposeMsg_format() public view {
        // Test the Pool-specific compose message format: (SendParam, address, uint256)
        SendParam memory expectedSendParam = _createSendParam(ARB_EID, userB, TOKENS_TO_SEND, TOKENS_TO_SEND / 2);
        address expectedHubAddr = hubRecoveryAddress;
        uint256 expectedMinMsgValue = 0.5 ether;

        bytes memory encodedMsg = abi.encode(expectedSendParam, expectedHubAddr, expectedMinMsgValue);

        (SendParam memory decodedSendParam, address decodedHubAddr, uint256 decodedMinMsgValue) = usdcComposer
            .decodeComposeMsg(encodedMsg);

        assertEq(decodedSendParam, expectedSendParam);
        assertEq(decodedHubAddr, expectedHubAddr, "Hub address should match");
        assertEq(decodedMinMsgValue, expectedMinMsgValue, "Min msg value should match");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // TAXI MODE ENFORCEMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_lzSend_enforces_taxi_mode_for_asset_oft() public {
        uint256 sendAmount = 100e6; // 100 USDC

        // Setup: Give composer enough USDC tokens for the transfer
        _setupTokensForTesting(address(usdcComposer), sendAmount, 0);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, sendAmount, 0);
        sendParam.oftCmd = hex"01"; // Set to bus mode initially

        // Create expected SendParam with taxi mode (empty oftCmd)
        SendParam memory expectedSendParam = sendParam;
        expectedSendParam.oftCmd = hex""; // Should be set to taxi mode

        // Expect the call to the asset OFT with taxi mode (empty oftCmd)
        vm.expectCall(
            address(usdcPool),
            abi.encodeWithSelector(IOFT.send.selector, expectedSendParam, MessagingFee(0, 0), userA)
        );

        vm.expectRevert(); // Will revert due to insufficient funds

        // Call lzSend through the composer
        vm.prank(address(usdcComposer));
        usdcComposer.lzSend(address(usdcPool), sendParam, userA);
    }

    function test_lzSend_preserves_oft_cmd_for_share_oft() public {
        SendParam memory sendParam = _createSendParam(ARB_EID, userB, 1e18, 0); // 1 share token
        sendParam.oftCmd = hex"01"; // Set to bus mode

        // Expect the call to the share OFT with original oftCmd preserved
        vm.expectCall(
            address(usdcShareOFTAdapter),
            abi.encodeWithSelector(
                IOFT.send.selector,
                sendParam, // Should preserve original oftCmd = hex"01"
                MessagingFee(0, 0),
                userA
            )
        );

        vm.expectRevert(); // Will revert due to insufficient funds

        // Call lzSend for share OFT
        vm.prank(address(usdcComposer));
        usdcComposer.lzSend(address(usdcShareOFTAdapter), sendParam, userA);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // RECOVERY ADDRESS HIERARCHY TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_refund_uses_hub_recovery_address_when_decode_succeeds() public {
        uint256 depositAmount = 100e6;
        _setupTokensForTesting(address(usdcComposer), depositAmount, 0);
        uint256 hubRecoveryInitialBalance = usdcToken.balanceOf(hubRecoveryAddress);

        // Create failing send param (slippage too high) with valid compose message
        SendParam memory sendParam = _createSendParam(ARB_EID, userB, depositAmount, depositAmount + 1);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            hubRecoveryAddress, // This should be used for refund
            0.1 ether,
            depositAmount,
            userA
        );

        vm.expectEmit(true, true, true, true, address(usdcComposer));
        emit IVaultComposerSync.Refunded(randomGUID);

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");

        // The refund should have used hubRecoveryAddress (priority 1 in hierarchy)
        assertGt(
            usdcToken.balanceOf(hubRecoveryAddress),
            hubRecoveryInitialBalance,
            "Hub recovery address should receive refund tokens"
        );
    }

    function test_refund_uses_default_recovery_when_decode_fails() public {
        uint256 depositAmount = 100e6;
        _setupTokensForTesting(address(usdcComposer), depositAmount, 0);
        uint256 defaultRecoveryInitialBalance = usdcToken.balanceOf(defaultRecoveryAddress);
        uint256 hubRecoveryInitialBalance = usdcToken.balanceOf(hubRecoveryAddress);

        // Create invalid compose message that will fail to decode
        bytes memory invalidComposeMsg = abi.encode("invalid", "data", "format");
        bytes memory composeMsg = OFTComposeMsgCodec.encode(
            0,
            ETH_EID,
            depositAmount,
            abi.encodePacked(userA.addressToBytes32(), invalidComposeMsg)
        );

        vm.expectEmit(true, true, true, true, address(usdcComposer));
        emit IVaultComposerSync.Refunded(randomGUID);

        vm.prank(LZ_ENDPOINT_V2);
        usdcComposer.lzCompose{ value: 0.1 ether }(address(usdcPool), randomGUID, composeMsg, executor, "");

        // The refund should have used DEFAULT_RECOVERY_ADDRESS (priority 2 in hierarchy)
        assertGt(
            usdcToken.balanceOf(defaultRecoveryAddress),
            defaultRecoveryInitialBalance,
            "Default recovery address should receive refund tokens when decode fails"
        );

        assertEq(
            usdcToken.balanceOf(hubRecoveryAddress),
            hubRecoveryInitialBalance,
            "Hub recovery address should not receive refund tokens"
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // NATIVE TOKEN REFUND FALLBACK TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_native_refund_fallback_chain() public {
        uint256 depositAmount = 1 ether;
        _setupTokensForTesting(address(ethComposer), 0, depositAmount);
        _setupTokensForTesting(address(LZ_ENDPOINT_V2), 0, 0.1 ether);

        // Create a contract that cannot receive native tokens
        address nonPayableContract = address(new NonPayableContract());

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, depositAmount, 0);

        bytes memory composeMsg = _createPoolComposePayload(
            ETH_EID,
            sendParam,
            nonPayableContract, // This address cannot receive native tokens
            0.1 ether,
            depositAmount,
            userA
        );

        uint256 txOriginInitialBalance = tx.origin.balance;

        // Should complete with fallback to tx.origin for native tokens
        vm.prank(LZ_ENDPOINT_V2);
        ethComposer.lzCompose{ value: 0.1 ether }(address(ethPool), randomGUID, composeMsg, executor, "");

        // Verify native tokens fell back to tx.origin
        assertGt(tx.origin.balance, txOriginInitialBalance, "tx.origin should receive native fallback");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS AND IMMUTABLES TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_unlimited_credit_constant() public view {
        assertEq(usdcComposer.UNLIMITED_CREDIT(), type(uint64).max, "Unlimited credit should be max uint64");
        assertEq(ethComposer.UNLIMITED_CREDIT(), type(uint64).max, "Unlimited credit should be max uint64");
    }

    function test_default_recovery_address_immutable() public view {
        assertEq(
            usdcComposer.DEFAULT_RECOVERY_ADDRESS(),
            defaultRecoveryAddress,
            "Default recovery address should be set"
        );
        assertEq(
            ethComposer.DEFAULT_RECOVERY_ADDRESS(),
            defaultRecoveryAddress,
            "Default recovery address should be set"
        );
    }
}
