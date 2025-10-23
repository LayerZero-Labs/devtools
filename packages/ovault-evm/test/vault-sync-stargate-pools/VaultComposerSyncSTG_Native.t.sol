// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// OpenZeppelin imports
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// LayerZero imports
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

// Contract imports
import { IWETH } from "../../contracts/interfaces/IWETH.sol";
import { VaultComposerSyncNative } from "../../contracts/VaultComposerSyncNative.sol";

// Base test imports
import { VaultComposerSyncSTG_ERC20ForkTest } from "./VaultComposerSyncSTG_ERC20.t.sol";

/// @dev ERC20ForkTest validates the reduction of PoolNative to Pool when the incoming tokens in lzReceive are ETH (and converts it to WETH)
/// @dev All underlying tests from ERC20ForkTest are executed for this test with the overrides of:
/// @dev setup() and _simulatelzReceive()
contract VaultComposerSyncSTG_NativeForkTest is VaultComposerSyncSTG_ERC20ForkTest {
    using OFTMsgCodec for address;

    /// @dev This is used to test the NativePool composer's specific behavior
    VaultComposerSyncNative public composerNative;
    IWETH public weth;

    function setUp() public virtual override {
        super.setUp();

        // Set up for USDC testing (can be overridden in inherited tests)
        composer = ethComposer;
        pool = ethPool;
        vault = ethVault;
        shareOFTAdapter = ethShareOFTAdapter;
        assetToken = wethToken;
        TO_LD = 10 ** (IERC20Metadata(address(wethToken)).decimals() - pool.sharedDecimals());

        weth = IWETH(address(wethToken));
    }

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
    // ADDITIONAL NATIVE-SPECIFIC TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_depositAndSendWETH() public {
        // Test that WETH gets properly wrapped to WETH for vault operations
        uint256 amtToSend = 1 ether;
        uint256 feeAmount = 0.1 ether;

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToSend, 0);

        uint256 wethBalanceBefore = weth.balanceOf(address(this));

        vm.deal(address(this), amtToSend + feeAmount);
        weth.deposit{ value: amtToSend }();
        weth.approve(address(ethComposer), amtToSend);

        assertEq(
            weth.balanceOf(address(this)),
            wethBalanceBefore + amtToSend,
            "Deposited WETH should be with the user"
        );
        assertEq(weth.balanceOf(address(ethComposer)), 0, "WETH should never be in the vault");

        ethComposer.depositAndSend{ value: feeAmount }(amtToSend, sendParam, address(this));

        // Verify WETH was used on the transfer
        assertEq(weth.balanceOf(address(this)), wethBalanceBefore, "User's WETH balance should go back to original");
        assertEq(weth.balanceOf(address(ethComposer)), 0, "WETH should never be in the vault");
    }

    function test_depositAndSendNative() public {
        uint256 amtToSend = 1 ether;
        uint256 feeAmount = 0.1 ether;

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToSend, 0);

        uint256 ethBalanceBefore = address(this).balance;
        vm.deal(address(this), amtToSend + feeAmount);
        assertEq(address(ethComposer).balance, 0, "ETH should never be in the vault");

        ethComposer.depositNativeAndSend{ value: feeAmount + amtToSend }(amtToSend, sendParam, address(this));

        assertLt(address(this).balance, ethBalanceBefore + feeAmount, "User's ETH balance should go back to original");
        assertEq(address(ethComposer).balance, 0, "ETH should never be in the vault");
    }

    function test_forkPoolComposerWrapsOnTransferFromPool() public {
        uint256 amt = 1 ether;

        uint256 wethBalanceBefore = weth.balanceOf(address(ethComposer));
        uint256 ethBalanceBefore = address(ethComposer).balance;

        vm.deal(address(ethPool), amt);
        vm.prank(address(ethPool));
        (bool success, ) = payable(address(ethComposer)).call{ value: amt }("");
        require(success, "ETH transfer failed");

        // New behavior: ETH is held until lzCompose, not wrapped immediately
        uint256 wethBalanceAfter = weth.balanceOf(address(ethComposer));
        assertEq(wethBalanceAfter, wethBalanceBefore, "WETH should not be wrapped immediately");
        assertEq(address(ethComposer).balance, ethBalanceBefore + amt, "ETH balance should increase");
    }

    function test_forkPoolComposerDoesNotWrapOnTransfersNotFromPool() public {
        uint256 amt = 1 ether;

        uint256 wethBalanceBefore = weth.balanceOf(address(ethComposer));
        uint256 ethBalanceBefore = address(ethComposer).balance;

        vm.deal(address(this), amt);
        (bool success, bytes memory returnData) = payable(address(ethComposer)).call{ value: amt }("");

        // ETH transfers from non-pool addresses should now fail due to receive() restriction
        assertFalse(success, "ETH transfer from non-pool address should fail");

        // Check that the failure is due to the expected error
        bytes4 expectedErrorSignature = bytes4(keccak256("ETHTransferOnlyFromAssetOFT()"));
        bytes4 actualErrorSignature = bytes4(returnData);
        assertEq(actualErrorSignature, expectedErrorSignature, "Should fail with ETHTransferOnlyFromAssetOFT error");

        assertEq(wethBalanceBefore, weth.balanceOf(address(ethComposer)), "WETH should not be wrapped");
        assertEq(address(ethComposer).balance, ethBalanceBefore, "ETH balance should remain unchanged");
    }

    /**
     * @dev Setup tokens for testing by simulating lzReceive sending ETH to composer
     * @param _recipient Address to receive ETH (should be the composer)
     * @param _amt Amount of ETH to send
     */
    function _simulatelzReceive(address _recipient, uint256 _amt) internal override {
        // Simulate lzReceive on NativePool sending ETH to composer (triggers receive())
        vm.deal(address(ethPool), _amt);
        vm.prank(address(ethPool));
        (bool success, ) = payable(_recipient).call{ value: _amt }("");
        require(success, "ETH transfer failed");

        // The composer now holds ETH until lzCompose is called
        // No wrapping happens here - that's deferred to lzCompose
    }

    /**
     * @dev Override to check ETH balance instead of WETH balance for native composer
     * @param _composer Address of the composer
     * @return The effective asset balance (ETH for native, WETH for regular)
     */
    function _getComposerAssetBalance(address _composer) internal view override returns (uint256) {
        // For native composer, check ETH balance since wrapping is deferred
        return _composer.balance;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // REDEEM TEST OVERRIDES - Need WETH for vault operations
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolSuccessRedeemToArbPool(uint256 _amtToDeposit) public override {
        uint256 amtToDepositShared = _amtToDeposit / TO_LD;
        uint64 maxCredit = _getPathCredit(pool, ARB_EID);
        vm.assume(_amtToDeposit > TO_LD * 1e2 && amtToDepositShared < maxCredit);

        // Setup vault shares for the composer - wrap ETH to WETH for vault operations
        _simulatelzReceive(address(composer), _amtToDeposit);
        vm.prank(address(composer));
        weth.deposit{ value: _amtToDeposit }(); // Wrap ETH to WETH

        vm.startPrank(address(composer));
        assetToken.approve(address(vault), _amtToDeposit);
        vault.deposit(_amtToDeposit, address(composer));
        vm.stopPrank();

        uint256 amtToRedeem = vault.balanceOf(address(composer));
        uint256 composerBalancePreRedeem = vault.balanceOf(address(composer));

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(ARB_EID, sendParam, 0.1 ether, amtToRedeem, userA);

        assertEq(amtToRedeem, composerBalancePreRedeem, "Composer should have more share balance after deposit");

        if (amtToDepositShared > maxCredit) vm.expectRevert();
        vm.prank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(shareOFTAdapter), randomGUID, redeemMsg, executor, "");

        uint256 targetBalance = amtToDepositShared > maxCredit ? composerBalancePreRedeem : 0;
        assertEq(vault.balanceOf(address(composer)), targetBalance, "Composer should have the same share balance");
    }

    function test_forkPoolSuccessRedeemToBeraOFT(uint256 _amtToDeposit) public override {
        uint256 amtToDepositShared = _amtToDeposit / TO_LD;
        uint64 maxCredit = _getPathCredit(pool, BERA_EID);
        /// @dev Reduce max credit to 1/100th of the max credit to avoid overflows on the vault
        vm.assume(_amtToDeposit > TO_LD * 1e2 && amtToDepositShared < (maxCredit / 1e2));

        // Setup vault shares for the composer - wrap ETH to WETH for vault operations
        _simulatelzReceive(address(composer), _amtToDeposit);
        vm.prank(address(composer));
        weth.deposit{ value: _amtToDeposit }(); // Wrap ETH to WETH

        vm.startPrank(address(composer));
        assetToken.approve(address(vault), _amtToDeposit);
        vault.deposit(_amtToDeposit, address(composer));
        vm.stopPrank();

        uint256 amtToRedeem = vault.balanceOf(address(composer));
        uint256 composerBalancePreRedeem = vault.balanceOf(address(composer));

        SendParam memory sendParam = _createSendParam(BERA_EID, userB, amtToRedeem, 0);

        bytes memory redeemMsg = _createPoolComposePayload(BERA_EID, sendParam, 0.1 ether, amtToRedeem, userA);

        assertEq(amtToRedeem, composerBalancePreRedeem, "Composer should have more share balance after deposit");

        vm.prank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(shareOFTAdapter), randomGUID, redeemMsg, executor, "");

        assertEq(vault.balanceOf(address(composer)), 0, "Composer should have the same share balance");
    }
}
