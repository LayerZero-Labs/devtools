// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

// OpenZeppelin imports
import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// LayerZero imports
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

// Contract imports
import { IWETH } from "../../contracts/interfaces/IWETH.sol";
import { VaultComposerSync } from "../../contracts/VaultComposerSync.sol";
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

        uint256 wethBalanceAfter = weth.balanceOf(address(ethComposer));
        assertEq(wethBalanceAfter, wethBalanceBefore + amt, "WETH should be wrapped");
        assertEq(ethBalanceBefore, address(ethComposer).balance, "ETH balance should remain the same");
    }

    function test_forkPoolComposerDoesNotWrapOnTransfersNotFromPool() public {
        uint256 amt = 1 ether;

        uint256 wethBalanceBefore = weth.balanceOf(address(ethComposer));
        uint256 ethBalanceBefore = address(ethComposer).balance;

        vm.deal(address(this), amt);
        (bool success, ) = payable(address(ethComposer)).call{ value: amt }("");
        require(success, "ETH transfer failed");

        assertEq(wethBalanceBefore, weth.balanceOf(address(ethComposer)), "WETH should not be wrapped");
        assertEq(address(ethComposer).balance, ethBalanceBefore + amt, "ETH balance should remain the same");
    }

    /**
     * @dev Setup tokens for testing by minting USDC and depositing WETH
     * @param _recipient Address to receive tokens
     * @param _amt Amount of tokens to mint
     */
    function _simulatelzReceive(address _recipient, uint256 _amt) internal override {
        vm.deal(address(ethPool), _amt);
        vm.prank(address(ethPool));
        (bool success, ) = payable(_recipient).call{ value: _amt }("");
        require(success, "ETH transfer failed");
    }
}
