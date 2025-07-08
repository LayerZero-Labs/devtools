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
