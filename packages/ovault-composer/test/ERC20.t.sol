// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";

import { IERC20Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import { MockERC20 } from "./utils/mocks/MockERC20.sol";
import { MockERC20MintBurn } from "./utils/mocks/MockERC20MintBurn.sol";
import { MockERC4626Adapter } from "./utils/mocks/MockERC4626Adapter.sol";
import { IERC20MintBurnExtension } from "../contracts/interfaces/IERC20MintBurnExtension.sol";

contract ERC20Test is Test {
    MockERC20 asset;
    MockERC20MintBurn share;

    MockERC4626Adapter vault;

    function setUp() public {
        asset = new MockERC20("Asset", "ASSET");
        share = new MockERC20MintBurn("Share", "SHARE");

        vault = new MockERC4626Adapter(address(asset), address(share));

        share.setSuperUser(address(vault), true);
    }

    function test_ERC4626AdapterCompliant() public view {
        assertTrue(IERC20MintBurnExtension(share).ERC4626AdapterCompliant());
        assertTrue(share.superUsers(address(vault)));
    }

    function testInvariant_Metadata() public view {
        assertEq(share.name(), vault.name());
        assertEq(share.symbol(), vault.symbol());
        assertEq(share.decimals(), vault.decimals());

        assertNotEq(address(vault.asset()), address(vault));
    }

    function test_Mint() public {
        share.mint(address(0xBEEF), 1e18);

        assertEq(share.totalSupply(), vault.totalSupply(), 1e18);
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)), 1e18);

        assertEq(share.totalSupply(), vault.totalSupply(), 1e18);
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)), 1e18);
    }

    function test_Burn() public {
        share.mint(address(0xBEEF), 1e18);
        share.burn(address(0xBEEF), 0.9e18);

        assertEq(share.totalSupply(), vault.totalSupply(), 1e18 - 0.9e18);
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)), 0.1e18);
    }

    function test_Approve() public {
        assertTrue(share.approve(address(0xBEEF), 1e18));

        assertEq(
            share.allowance(address(this), address(0xBEEF)),
            vault.allowance(address(this), address(0xBEEF)),
            1e18
        );

        assertTrue(vault.approve(address(0xBEEF), 10e18));

        assertEq(
            share.allowance(address(this), address(0xBEEF)),
            vault.allowance(address(this), address(0xBEEF)),
            10e18
        );
    }

    function test_TransferUnit() public {
        share.mint(address(this), 1e18);

        assertTrue(share.transfer(address(0xBEEF), 0.5e18));
        assertTrue(vault.transfer(address(0xBEEF), 0.5e18));
        assertEq(share.totalSupply(), vault.totalSupply(), 1e18);

        assertEq(share.balanceOf(address(this)), vault.balanceOf(address(this)), 0);
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)), 1e18);

        assertEq(share.balanceOf(address(this)), vault.balanceOf(address(this)));
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)));
    }

    function test_TransferFrom() public {
        address from = address(0xABCD);

        share.mint(from, 1e18);

        vm.prank(from);
        share.approve(address(this), 1e18);

        assertTrue(share.transferFrom(from, address(0xBEEF), 0.5e18));
        assertTrue(vault.transferFrom(from, address(0xBEEF), 0.5e18));

        assertEq(share.totalSupply(), vault.totalSupply(), 1e18);

        assertEq(share.allowance(from, address(this)), vault.allowance(from, address(this)), 0);

        assertEq(share.balanceOf(from), vault.balanceOf(from), 0);
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)), 1e18);
    }

    function test_InfiniteApproveTransferFrom() public {
        address from = address(0xABCD);

        share.mint(from, 1e18);

        vm.prank(from);
        share.approve(address(this), type(uint256).max);
        assertTrue(vault.transferFrom(from, address(0xBEEF), 1e18));

        assertEq(share.totalSupply(), vault.totalSupply(), 1e18);

        assertEq(share.allowance(from, address(this)), vault.allowance(from, address(this)), type(uint256).max);

        assertEq(share.balanceOf(from), vault.balanceOf(from), 0);
        assertEq(share.balanceOf(address(0xBEEF)), vault.balanceOf(address(0xBEEF)), 1e18);
    }

    function test_FailTransferInsufficientBalance() public {
        share.mint(address(this), 0.9e18);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, address(this), 0.9e18, 1e18)
        );
        share.transfer(address(0xBEEF), 1e18);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, address(this), 0.9e18, 1e18)
        );
        vault.transfer(address(0xBEEF), 1e18);
    }

    function test_FailTransferFromInsufficientAllowance() public {
        address from = address(0xABCD);

        share.mint(from, 1e18);

        vm.prank(from);
        share.approve(address(this), 0.9e18);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(this), 0.9e18, 1e18)
        );
        vault.transferFrom(from, address(0xBEEF), 1e18);

        vm.prank(from);
        vault.approve(address(this), 0.9e18);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(this), 0.9e18, 1e18)
        );
        share.transferFrom(from, address(0xBEEF), 1e18);
    }

    function test_FailTransferFromInsufficientBalance() public {
        address from = address(0xABCD);

        share.mint(from, 0.9e18);

        vm.prank(from);
        share.approve(address(this), 1e18);

        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, from, 0.9e18, 1e18));
        share.transferFrom(from, address(0xBEEF), 1e18);

        vm.prank(from);
        vault.approve(address(this), 1e18);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, from, 0.9e18, 1e18));
        vault.transferFrom(from, address(0xBEEF), 1e18);
    }

    function test_Metadata(string calldata name, string calldata symbol) public {
        MockERC20 tkn = new MockERC20(name, symbol);
        assertEq(tkn.name(), name);
        assertEq(tkn.symbol(), symbol);
        assertEq(tkn.decimals(), 18);
    }

    function test_Mint(address from, uint256 amount) public {
        vm.assume(from != address(0));
        share.mint(from, amount);

        assertEq(share.totalSupply(), vault.totalSupply(), amount);
        assertEq(share.balanceOf(from), vault.balanceOf(from), amount);
    }

    function test_Burn(address from, uint256 mintAmount, uint256 burnAmount) public {
        vm.assume(from != address(0));
        burnAmount = bound(burnAmount, 0, mintAmount);

        share.mint(from, mintAmount);
        share.burn(from, burnAmount);

        assertEq(share.totalSupply(), vault.totalSupply(), mintAmount - burnAmount);
        assertEq(share.balanceOf(from), vault.balanceOf(from), mintAmount - burnAmount);
    }

    function test_Approve(address to, uint256 amount) public {
        vm.assume(to != address(0));
        amount = bound(amount, 0, type(uint256).max - 1);

        assertTrue(share.approve(to, amount));
        assertEq(share.allowance(address(this), to), vault.allowance(address(this), to), amount);

        assertTrue(vault.approve(to, amount + 1));
        assertEq(share.allowance(address(this), to), vault.allowance(address(this), to), amount + 1);
    }

    function test_Transfer(address from, uint256 amount) public {
        vm.assume(from != address(0));
        share.mint(address(this), amount);

        assertTrue(share.transfer(from, amount));
        assertEq(share.totalSupply(), vault.totalSupply(), amount);

        if (address(this) == from) {
            assertEq(share.balanceOf(address(this)), vault.balanceOf(address(this)), amount);
        } else {
            assertEq(share.balanceOf(address(this)), vault.balanceOf(address(this)), 0);
            assertEq(share.balanceOf(from), vault.balanceOf(from), amount);
        }
    }

    function test_TransferFrom(address to, uint256 approval, uint256 amount) public {
        vm.assume(to != address(0));
        amount = bound(amount, 0, approval);

        address from = address(0xABCD);

        share.mint(from, amount);

        vm.prank(from);
        share.approve(address(this), approval);

        assertTrue(share.transferFrom(from, to, amount));
        assertEq(share.totalSupply(), vault.totalSupply(), amount);

        uint256 app = from == address(this) || approval == type(uint256).max ? approval : approval - amount;
        assertEq(share.allowance(from, address(this)), vault.allowance(from, address(this)), app);

        if (from == to) {
            assertEq(share.balanceOf(from), vault.balanceOf(from), amount);
        } else {
            assertEq(share.balanceOf(from), vault.balanceOf(from), 0);
            assertEq(share.balanceOf(to), vault.balanceOf(to), amount);
        }
    }

    function test_FailBurnInsufficientBalance(address to, uint256 mintAmount, uint256 burnAmount) public {
        vm.assume(to != address(0));
        mintAmount = bound(mintAmount, 0, type(uint256).max - 1);
        burnAmount = bound(burnAmount, mintAmount + 1, type(uint256).max);

        share.mint(to, mintAmount);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, to, mintAmount, burnAmount)
        );
        share.burn(to, burnAmount);
    }

    function test_FailTransferInsufficientBalance(address to, uint256 mintAmount, uint256 sendAmount) public {
        vm.assume(to != address(0));
        mintAmount = bound(mintAmount, 0, type(uint256).max - 1);
        sendAmount = bound(sendAmount, mintAmount + 1, type(uint256).max);

        share.mint(address(this), mintAmount);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientBalance.selector,
                address(this),
                mintAmount,
                sendAmount
            )
        );
        share.transfer(to, sendAmount);
    }

    function test_FailTransferFromInsufficientAllowance(address to, uint256 approval, uint256 amount) public {
        vm.assume(to != address(0));
        approval = bound(approval, 0, type(uint256).max - 1);
        amount = bound(amount, approval + 1, type(uint256).max);

        address from = address(0xABCD);

        share.mint(from, amount);

        vm.prank(from);
        share.approve(address(this), approval);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(this), approval, amount)
        );
        share.transferFrom(from, to, amount);
    }

    function test_FailTransferFromInsufficientBalance(address to, uint256 mintAmount, uint256 sendAmount) public {
        vm.assume(to != address(0));
        mintAmount = bound(mintAmount, 0, type(uint256).max - 1);
        sendAmount = bound(sendAmount, mintAmount + 1, type(uint256).max);

        address from = address(0xABCD);

        share.mint(from, mintAmount);

        vm.prank(from);
        share.approve(address(this), sendAmount);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, from, mintAmount, sendAmount)
        );
        share.transferFrom(from, to, sendAmount);
    }

    function assertEq(uint256 term1, uint256 term2, uint256 term3) internal pure {
        assertEq(term1, term2, "term1 and term2 should be equal");
        assertEq(term1, term3, "term1 and term3 should be equal");
    }
}
