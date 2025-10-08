// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// OpenZeppelin imports
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// LayerZero imports
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

// Contract imports
import { VaultComposerSync } from "../../contracts/VaultComposerSync.sol";
import { VaultComposerSyncSTG_BaseTest } from "./VaultComposerSyncSTG_Base.t.sol";

// Mock imports for OFT Adapter
import { MockOFTAdapter } from "../mocks/MockOFT.sol";
import { StargatePool } from "../mocks/MockOFT.sol";

contract VaultComposerSyncSTG_ERC20ForkTest is VaultComposerSyncSTG_BaseTest {
    using OFTMsgCodec for address;

    // Generic contract instances - set in setUp for reusability
    VaultComposerSync public composer;
    StargatePool public pool;
    IERC4626 public vault;
    MockOFTAdapter public shareOFTAdapter;
    IERC20 public assetToken;
    uint256 public TO_LD;

    /// @dev SafeCast on u64 in stargate pools
    uint256 public MAX_TOKENS = type(uint64).max;

    // Test constants
    uint256 public constant TOKENS_TO_SEND_USDC = 100e6;

    function setUp() public virtual override {
        super.setUp();

        // Set up for USDC testing (can be overridden in inherited tests)
        composer = usdcComposer;
        pool = usdcPool;
        vault = usdcVault;
        shareOFTAdapter = usdcShareOFTAdapter;
        assetToken = usdcToken;
        TO_LD = 10 ** (IERC20Metadata(address(usdcToken)).decimals() - pool.sharedDecimals());
    }

    function test_setupPool() public view {
        // Validate deployment addresses using abstract variables
        assertEq(address(composer.VAULT()), address(vault), "Vault address mismatch");
        assertEq(composer.ASSET_OFT(), address(pool), "Asset OFT address mismatch");
        assertEq(composer.SHARE_OFT(), address(shareOFTAdapter), "Share OFT address mismatch");
        assertEq(composer.ASSET_ERC20(), address(assetToken), "Asset ERC20 address mismatch");

        // Validate OFTAdapter setup
        assertEq(shareOFTAdapter.token(), address(vault), "OFTAdapter token mismatch");
        assertEq(address(shareOFTAdapter.endpoint()), LZ_ENDPOINT_V2, "OFTAdapter endpoint mismatch");
        assertEq(shareOFTAdapter.owner(), deployer, "OFTAdapter owner mismatch");
        assertEq(shareOFTAdapter.approvalRequired(), true, "OFTAdapter approvalRequired mismatch");

        // Validate path credits using base test helpers
        assertGt(_getPathCredit(pool, ARB_EID), 0, "Pool should have credit for ARB");
        assertLt(_getPathCredit(pool, ARB_EID), UNLIMITED_CREDIT, "ARB should be Pool path (limited credit)");
        assertEq(_getPathCredit(pool, BERA_EID), UNLIMITED_CREDIT, "BERA should be OFT path (unlimited credit)");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FORK TESTS - Failed Deposit from Stargate Pool
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolDepositFromArbPool(uint256 _amtToSend) public {
        uint64 maxCredit = _getPathCredit(pool, ARB_EID);
        uint256 amtToSendShared = _amtToSend / TO_LD;
        vm.assume(_amtToSend > TO_LD * 1e2 && amtToSendShared < maxCredit);

        // Setup tokens using base test helper
        _simulatelzReceive(address(composer), _amtToSend);

        SendParam memory sendParam = _createSendParam(ARB_EID, userB, _amtToSend, type(uint256).max);
        bytes memory composeMsg = _createPoolComposePayload(ARB_EID, sendParam, 0.1 ether, _amtToSend, userA);

        uint256 composerBalancePreDeposit = assetToken.balanceOf(address(composer));
        assertEq(composerBalancePreDeposit, _amtToSend, "Composer should have the amount to send");

        if (amtToSendShared > maxCredit) vm.expectRevert();
        vm.prank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(pool), randomGUID, composeMsg, executor, "");

        uint256 targetBalance = amtToSendShared > maxCredit ? composerBalancePreDeposit : 0;
        assertEq(assetToken.balanceOf(address(composer)), targetBalance, "Composer balance should be the same");
    }

    function test_forkPoolDepositFailedFromBeraOFT(uint256 _amtToSend) public {
        uint64 maxCredit = _getPathCredit(pool, BERA_EID);
        uint256 amtToSendShared = _amtToSend / TO_LD;
        vm.assume(_amtToSend > TO_LD * 1e2 && amtToSendShared < maxCredit);

        // Setup tokens using base test helper
        _simulatelzReceive(address(composer), _amtToSend);

        SendParam memory sendParam = _createSendParam(BERA_EID, userB, _amtToSend, type(uint256).max);
        bytes memory composeMsg = _createPoolComposePayload(BERA_EID, sendParam, 0.1 ether, _amtToSend, userA);

        assertEq(assetToken.balanceOf(address(composer)), _amtToSend, "Composer should have the amount to send");

        vm.prank(LZ_ENDPOINT_V2);
        composer.lzCompose{ value: 0.1 ether }(address(pool), randomGUID, composeMsg, executor, "");

        assertEq(assetToken.balanceOf(address(composer)), 0, "Composer should have 0 balance");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FORK TESTS - Successful Redeem to Stargate Pool
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_forkPoolSuccessRedeemToArbPool(uint256 _amtToDeposit) public {
        uint256 amtToDepositShared = _amtToDeposit / TO_LD;
        uint64 maxCredit = _getPathCredit(pool, ARB_EID);
        vm.assume(_amtToDeposit > TO_LD * 1e2 && amtToDepositShared < maxCredit);

        // Setup vault shares for the composer
        _simulatelzReceive(address(composer), _amtToDeposit);
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

    function test_forkPoolSuccessRedeemToBeraOFT(uint256 _amtToDeposit) public {
        uint256 amtToDepositShared = _amtToDeposit / TO_LD;
        uint64 maxCredit = _getPathCredit(pool, BERA_EID);
        /// @dev Reduce max credit to 1/100th of the max credit to avoid overflows on the vault
        vm.assume(_amtToDeposit > TO_LD * 1e2 && amtToDepositShared < (maxCredit / 1e2));

        // Setup vault shares for the composer
        _simulatelzReceive(address(composer), _amtToDeposit);
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

    /**
     * @dev Setup tokens for testing by minting USDC and depositing WETH
     * @param _recipient Address to receive tokens
     * @param _amt Amount of tokens to mint
     */
    function _simulatelzReceive(address _recipient, uint256 _amt) internal virtual {
        usdcToken.mint(_recipient, _amt);
    }
}
