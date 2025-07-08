// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { IERC20Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import { MockOFT, MockOFTAdapter } from "./mocks/MockOFT.sol";
import { MockOVault } from "./mocks/MockOVault.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

import { console } from "forge-std/console.sol";

/// @dev Equivalent to Solmate's ERC4626 tests - https://github.com/transmissions11/solmate/blob/main/src/test/ERC4626.t.sol
contract OVaultERC4626EquivalenceTest is TestHelperOz5 {
    using Math for uint256;

    MockOFT assetOFT;
    MockOFTAdapter shareOFT;
    MockOVault vault;

    string public constant ASSET_NAME = "Mock Token";
    string public constant ASSET_SYMBOL = "TKN";
    string public constant SHARE_NAME = "Mock Share";
    string public constant SHARE_SYMBOL = "SHARE";

    uint32 internal constant A_EID = 1;

    function setUp() public override {
        super.setUp();
        setUpEndpoints(1, LibraryType.UltraLightNode);

        assetOFT = new MockOFT(ASSET_NAME, ASSET_SYMBOL, address(endpoints[A_EID]), address(this));

        vault = new MockOVault(SHARE_NAME, SHARE_SYMBOL, assetOFT.token());
        shareOFT = new MockOFTAdapter(address(vault), address(endpoints[A_EID]), address(this));
    }

    function test_ovault_invariantMetadata() public view {
        assertEq(vault.name(), SHARE_NAME);
        assertEq(vault.symbol(), SHARE_SYMBOL);
        assertEq(vault.decimals(), 18);
    }

    function testFuzz_ovault_SingleDepositWithdraw(uint128 amount) public {
        if (amount == 0) amount = 1;

        uint256 aliceassetAmount = amount;

        address alice = address(0xABCD);

        assetOFT.mint(alice, aliceassetAmount);

        vm.prank(alice);
        assetOFT.approve(address(vault), aliceassetAmount);
        assertEq(assetOFT.allowance(alice, address(vault)), aliceassetAmount);

        uint256 alicePreDepositBal = assetOFT.balanceOf(alice);

        uint256 vaultTotalSupply = vault.totalSupply();
        uint256 assetTotalSupply = IERC20(vault.asset()).totalSupply();
        console.log("vault totalSupply", vaultTotalSupply);
        console.log("asset totalSupply", assetTotalSupply);

        console.log("previewDeposit", vault.previewDeposit(aliceassetAmount));

        vm.prank(alice);
        uint256 aliceShareAmount = vault.deposit(aliceassetAmount, alice);

        // Expect exchange rate to be 1:1 on initial deposit.
        assertEq(aliceassetAmount, aliceShareAmount);
        assertEq(vault.previewWithdraw(aliceShareAmount), aliceassetAmount);
        assertEq(vault.previewDeposit(aliceassetAmount), aliceShareAmount);
        assertEq(vault.totalSupply(), aliceShareAmount);
        assertEq(vault.totalAssets(), aliceassetAmount);
        assertEq(vault.balanceOf(alice), aliceShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), aliceassetAmount);
        assertEq(assetOFT.balanceOf(alice), alicePreDepositBal - aliceassetAmount);

        vm.prank(alice);
        vault.withdraw(aliceassetAmount, alice, alice);

        assertEq(vault.totalAssets(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(assetOFT.balanceOf(alice), alicePreDepositBal);
    }

    function testFuzz_ovault_SingleMintRedeem(uint128 amount) public {
        if (amount == 0) amount = 1;

        uint256 aliceShareAmount = amount;

        address alice = address(0xABCD);

        assetOFT.mint(alice, aliceShareAmount);

        vm.prank(alice);
        assetOFT.approve(address(vault), aliceShareAmount);
        assertEq(assetOFT.allowance(alice, address(vault)), aliceShareAmount);

        uint256 alicePreDepositBal = assetOFT.balanceOf(alice);

        vm.prank(alice);
        uint256 aliceUnderlyingAmount = vault.mint(aliceShareAmount, alice);

        // Expect exchange rate to be 1:1 on initial mint.
        assertEq(aliceShareAmount, aliceUnderlyingAmount);
        assertEq(vault.previewWithdraw(aliceShareAmount), aliceUnderlyingAmount);
        assertEq(vault.previewDeposit(aliceUnderlyingAmount), aliceShareAmount);
        assertEq(vault.totalSupply(), aliceShareAmount);
        assertEq(vault.totalAssets(), aliceUnderlyingAmount);
        assertEq(vault.balanceOf(alice), aliceUnderlyingAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), aliceUnderlyingAmount);
        assertEq(assetOFT.balanceOf(alice), alicePreDepositBal - aliceUnderlyingAmount);

        vm.prank(alice);
        vault.redeem(aliceShareAmount, alice, alice);

        assertEq(vault.totalAssets(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(assetOFT.balanceOf(alice), alicePreDepositBal);
    }

    function test_ovault_MultipleMintDepositRedeemWithdraw() public {
        // Scenario:
        // A = Alice, B = Bob
        //  ________________________________________________________
        // | Vault shares | A share | A assets | B share | B assets |
        // |========================================================|
        // | 1. Alice mints 2000 shares (costs 2000 tokens)         |
        // |--------------|---------|----------|---------|----------|
        // |         2000 |    2000 |     2000 |       0 |        0 |
        // |--------------|---------|----------|---------|----------|
        // | 2. Bob deposits 4000 tokens (mints 4000 shares)        |
        // |--------------|---------|----------|---------|----------|
        // |         6000 |    2000 |     2000 |    4000 |     4000 |
        // |--------------|---------|----------|---------|----------|
        // | 3. Vault mutates by +3000 tokens...                    |
        // |    (simulated yield returned from strategy)...         |
        // |--------------|---------|----------|---------|----------|
        // |         6000 |    2000 |     3000 |    4000 |     6000 |
        // |--------------|---------|----------|---------|----------|
        // | 4. Alice deposits 2000 tokens (mints 1333 shares)      |
        // |--------------|---------|----------|---------|----------|
        // |         7333 |    3333 |     4999 |    4000 |     6000 |
        // |--------------|---------|----------|---------|----------|
        // | 5. Bob mints 2000 shares (costs 3001 assets)           |
        // |    NOTE: Bob's assets spent got rounded up             |
        // |    NOTE: Alice's vault assets got rounded up           |
        // |--------------|---------|----------|---------|----------|
        // |         9333 |    3333 |     5000 |    6000 |     9000 |
        // |--------------|---------|----------|---------|----------|
        // | 6. Vault mutates by +3000 tokens...                    |
        // |    (simulated yield returned from strategy)            |
        // |    NOTE: Vault holds 17001 tokens, but sum of          |
        // |          assetsOf() is 17000.                          |
        // |--------------|---------|----------|---------|----------|
        // |         9333 |    3333 |     6071 |    6000 |    10929 |
        // |--------------|---------|----------|---------|----------|
        // | 7. Alice redeem 1333 shares (2428 assets)              |
        // |--------------|---------|----------|---------|----------|
        // |         8000 |    2000 |     3643 |    6000 |    10929 |
        // |--------------|---------|----------|---------|----------|
        // | 8. Bob withdraws 2928 assets (1608 shares)             |
        // |--------------|---------|----------|---------|----------|
        // |         6392 |    2000 |     3643 |    4392 |     8000 |
        // |--------------|---------|----------|---------|----------|
        // | 9. Alice withdraws 3643 assets (2000 shares)           |
        // |    NOTE: Bob's assets have been rounded back up        |
        // |--------------|---------|----------|---------|----------|
        // |         4392 |       0 |        0 |    4392 |     8001 |
        // |--------------|---------|----------|---------|----------|
        // | 10. Bob redeem 4392 shares (8001 tokens)               |
        // |--------------|---------|----------|---------|----------|
        // |            0 |       0 |        0 |       0 |        0 |
        // |______________|_________|__________|_________|__________|

        address alice = address(0xABCD);
        address bob = address(0xDCBA);

        uint256 mutationassetAmount = 3000;

        assetOFT.mint(alice, 4000);

        vm.prank(alice);
        assetOFT.approve(address(vault), 4000);

        assertEq(assetOFT.allowance(alice, address(vault)), 4000);

        assetOFT.mint(bob, 7001);

        vm.prank(bob);
        assetOFT.approve(address(vault), 7001);

        assertEq(assetOFT.allowance(bob, address(vault)), 7001);

        // 1. Alice mints 2000 shares (costs 2000 tokens)
        vm.prank(alice);
        uint256 aliceassetAmount = vault.mint(2000, alice);

        uint256 aliceShareAmount = vault.previewDeposit(aliceassetAmount);

        // Expect to have received the requested mint amount.
        assertEq(aliceShareAmount, 2000);
        assertEq(vault.balanceOf(alice), aliceShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), aliceassetAmount);
        assertEq(vault.convertToShares(aliceassetAmount), vault.balanceOf(alice));

        // Expect a 1:1 ratio before mutation.
        assertEq(aliceassetAmount, 2000);

        // Sanity check.
        assertEq(vault.totalSupply(), aliceShareAmount);
        assertEq(vault.totalAssets(), aliceassetAmount);

        // 2. Bob deposits 4000 tokens (mints 4000 shares)
        vm.prank(bob);
        uint256 bobShareAmount = vault.deposit(4000, bob);
        uint256 bobassetAmount = vault.previewWithdraw(bobShareAmount);

        // Expect to have received the requested asset amount.
        assertEq(bobassetAmount, 4000);
        assertEq(vault.balanceOf(bob), bobShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), bobassetAmount);
        assertEq(vault.convertToShares(bobassetAmount), vault.balanceOf(bob));

        // Expect a 1:1 ratio before mutation.
        assertEq(bobShareAmount, bobassetAmount);

        // Sanity check.
        uint256 preMutationShareBal = aliceShareAmount + bobShareAmount;
        uint256 preMutationBal = aliceassetAmount + bobassetAmount;
        assertEq(vault.totalSupply(), preMutationShareBal);
        assertEq(vault.totalAssets(), preMutationBal);
        assertEq(vault.totalSupply(), 6000);
        assertEq(vault.totalAssets(), 6000);

        // 3. Vault mutates by +3000 tokens...                    |
        //    (simulated yield returned from strategy)...
        // The Vault now contains more tokens than deposited which causes the exchange rate to change.
        // Alice share is 33.33% of the Vault, Bob 66.66% of the Vault.
        // Alice's share count stays the same but the asset amount changes from 2000 to 3000.
        // Bob's share count stays the same but the asset amount changes from 4000 to 6000.
        assetOFT.mint(address(vault), mutationassetAmount);
        assertEq(vault.totalSupply(), preMutationShareBal);
        assertEq(vault.totalAssets(), preMutationBal + mutationassetAmount);
        assertEq(vault.balanceOf(alice), aliceShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), aliceassetAmount + (mutationassetAmount / 3) * 1);
        assertEq(vault.balanceOf(bob), bobShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), bobassetAmount + (mutationassetAmount / 3) * 2);

        // 4. Alice deposits 2000 tokens (mints 1333 shares)
        vm.prank(alice);
        vault.deposit(2000, alice);

        assertEq(vault.totalSupply(), 7333);
        assertEq(vault.balanceOf(alice), 3333);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 4999);
        assertEq(vault.balanceOf(bob), 4000);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 6000);

        // 5. Bob mints 2000 shares (costs 3001 assets)
        // NOTE: Bob's assets spent got rounded up
        // NOTE: Alices's vault assets got rounded up
        vm.prank(bob);
        vault.mint(2000, bob);

        assertEq(vault.totalSupply(), 9333);
        assertEq(vault.balanceOf(alice), 3333);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 5000);
        assertEq(vault.balanceOf(bob), 6000);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 9000);

        // Sanity checks:
        // Alice and bob should have spent all their tokens now
        assertEq(assetOFT.balanceOf(alice), 0);
        assertEq(assetOFT.balanceOf(bob), 0);
        // Assets in vault: 4k (alice) + 7k (bob) + 3k (yield) + 1 (round up)
        assertEq(vault.totalAssets(), 14001);

        // 6. Vault mutates by +3000 tokens
        // NOTE: Vault holds 17001 tokens, but sum of assetsOf() is 17000.
        assetOFT.mint(address(vault), mutationassetAmount);
        assertEq(vault.totalAssets(), 17001);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 6071);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 10929);

        // 7. Alice redeem 1333 shares (2428 assets)
        vm.prank(alice);
        vault.redeem(1333, alice, alice);

        assertEq(assetOFT.balanceOf(alice), 2428);
        assertEq(vault.totalSupply(), 8000);
        assertEq(vault.totalAssets(), 14573);
        assertEq(vault.balanceOf(alice), 2000);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 3643);
        assertEq(vault.balanceOf(bob), 6000);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 10929);

        // 8. Bob withdraws 2929 assets (1608 shares)
        vm.prank(bob);
        vault.withdraw(2929, bob, bob);

        assertEq(assetOFT.balanceOf(bob), 2929);
        assertEq(vault.totalSupply(), 6392);
        assertEq(vault.totalAssets(), 11644);
        assertEq(vault.balanceOf(alice), 2000);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 3643);
        assertEq(vault.balanceOf(bob), 4392);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 8000);

        // 9. Alice withdraws 3643 assets (2000 shares)
        // NOTE: Bob's assets have been rounded back up
        vm.prank(alice);
        vault.withdraw(3643, alice, alice);

        assertEq(assetOFT.balanceOf(alice), 6071);
        assertEq(vault.totalSupply(), 4392);
        assertEq(vault.totalAssets(), 8001);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(vault.balanceOf(bob), 4392);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 8001);

        // 10. Bob redeem 4392 shares (8001 tokens)
        vm.prank(bob);
        vault.redeem(4392, bob, bob);
        assertEq(assetOFT.balanceOf(bob), 10930);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(vault.balanceOf(bob), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 0);

        // Sanity check
        assertEq(assetOFT.balanceOf(address(vault)), 0);
    }

    function test_ovault_FailDepositWithNotEnoughApproval() public {
        assetOFT.mint(address(this), 0.5e18);
        assetOFT.approve(address(vault), 0.5e18);
        assertEq(assetOFT.allowance(address(this), address(vault)), 0.5e18);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(vault), 0.5e18, 1e18)
        );
        vault.deposit(1e18, address(this));
    }

    function test_ovault_FailWithdrawExceedsMaxWithdraw() public {
        assetOFT.mint(address(this), 0.5e18);
        assetOFT.approve(address(vault), 0.5e18);

        vault.deposit(0.5e18, address(this));

        vm.expectRevert(
            abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxWithdraw.selector, address(this), 1e18, 0.5e18)
        );
        vault.withdraw(1e18, address(this), address(this));
    }

    function test_ovault_FailRedeemWithNotEnoughShareAmount() public {
        assetOFT.mint(address(this), 0.5e18);
        assetOFT.approve(address(vault), 0.5e18);

        vault.deposit(0.5e18, address(this));

        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxRedeem.selector, address(this), 1e18, 0.5e18));
        vault.redeem(1e18, address(this), address(this));
    }

    function test_ovault_FailWithdrawWithNoassetAmount() public {
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxWithdraw.selector, address(this), 1e18, 0));
        vault.withdraw(1e18, address(this), address(this));
    }

    function test_ovault_FailRedeemWithNoShareAmount() public {
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxRedeem.selector, address(this), 1e18, 0));
        vault.redeem(1e18, address(this), address(this));
    }

    function test_ovault_FailDepositWithNoApproval() public {
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(vault), 0, 1e18)
        );
        vault.deposit(1e18, address(this));
    }

    function test_ovault_FailMintWithNoApproval() public {
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(vault), 0, 1e18)
        );
        vault.mint(1e18, address(this));
    }

    function test_ovault_MintZero() public {
        vault.mint(0, address(this));

        assertEq(vault.balanceOf(address(this)), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(address(this))), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), 0);
    }

    function test_ovault_WithdrawZero() public {
        vault.withdraw(0, address(this), address(this));

        assertEq(vault.balanceOf(address(this)), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(address(this))), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), 0);
    }

    function test_ovault_VaultInteractionsForSomeoneElse() public {
        // init 2 users with a 1e18 balance
        address alice = address(0xABCD);
        address bob = address(0xDCBA);
        assetOFT.mint(alice, 1e18);
        assetOFT.mint(bob, 1e18);

        vm.prank(alice);
        assetOFT.approve(address(vault), 1e18);

        vm.prank(bob);
        assetOFT.approve(address(vault), 1e18);

        // alice deposits 1e18 for bob
        vm.prank(alice);
        vault.deposit(1e18, bob);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 1e18);
        assertEq(assetOFT.balanceOf(alice), 0);

        // bob mint 1e18 for alice
        vm.prank(bob);
        vault.mint(1e18, alice);
        assertEq(vault.balanceOf(alice), 1e18);
        assertEq(vault.balanceOf(bob), 1e18);
        assertEq(assetOFT.balanceOf(bob), 0);

        // alice redeem 1e18 for bob
        vm.prank(alice);
        vault.redeem(1e18, bob, alice);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 1e18);
        assertEq(assetOFT.balanceOf(bob), 1e18);

        // bob withdraw 1e18 for alice
        vm.prank(bob);
        vault.withdraw(1e18, alice, bob);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 0);
        assertEq(assetOFT.balanceOf(alice), 1e18);
    }
}
