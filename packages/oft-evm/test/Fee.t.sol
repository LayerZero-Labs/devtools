// SPDX-LICENSE-IDENTIFIER: UNLICENSED

pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFee } from "../contracts/interfaces/IFee.sol";
import { Fee } from "../contracts/Fee.sol";

contract FeeTest is Test {
    function test_setDefaultFeeBps(uint16 _feeBps) public {
        // 1. Set up the test.
        Fee fee = new FeeImpl(0);

        if (_feeBps >= fee.BPS_DENOMINATOR()) {
            // 2a. Test revert if the fee is too high
            vm.expectRevert(IFee.InvalidBps.selector);
            fee.setDefaultFeeBps(_feeBps);
        } else {
            // 2b. Test the success condition.
            fee.setDefaultFeeBps(_feeBps);
            assertEq(fee.defaultFeeBps(), _feeBps);
        }
    }

    function test_setFeeBps(uint16 _defaultFeeBps, uint32 _dstEid, uint16 _feeBps, bool _enabled) public {
        // 1. Set up the test including some default fee
        Fee fee = new FeeImpl(0);
        vm.assume(_defaultFeeBps < fee.BPS_DENOMINATOR());
        fee.setDefaultFeeBps(_defaultFeeBps);
        assertEq(fee.defaultFeeBps(), _defaultFeeBps);

        if (_feeBps >= fee.BPS_DENOMINATOR()) {
            // 2a. Test revert if the fee is too high
            vm.expectRevert(IFee.InvalidBps.selector);
            fee.setFeeBps(_dstEid, _feeBps, _enabled);
        } else {
            // 2b. Test the success condition.
            fee.setFeeBps(_dstEid, _feeBps, _enabled);
            (uint16 actualFeeBps, bool actualEnabled) = fee.feeBps(_dstEid);
            assertEq(actualFeeBps, _feeBps);
            assertEq(actualEnabled, _enabled);
            assertEq(FeeImpl(address(fee)).getFeeBps(_dstEid), _enabled ? _feeBps : _defaultFeeBps);
        }
    }

    function test_withdrawFees(address _user, uint256 _feeBalance, uint256 _contractBalance) public {
        // 1. Set up the test.  _feeBalance are the fees that are withdrawn, contractBalance may contain other tokens.
        vm.assume(_feeBalance <= _contractBalance);
        Fee fee = new FeeImpl(_feeBalance);
        vm.assume(_user != address(this));
        address _to = payable(makeAddr("to"));

        // 2. Test that calling with non-owner reverts.
        vm.prank(_user);
        vm.expectRevert("Ownable: caller is not the owner");
        fee.withdrawFees(_to);

        // 3. Add balance to contract.  Withdraw fees and check balances.
        vm.deal(Ownable(fee).owner(), 1 ether);
        vm.deal(address(fee), _contractBalance);
        assertEq(address(fee).balance, _contractBalance);
        vm.prank(Ownable(fee).owner());
        fee.withdrawFees(_to);

        // 4. Check that the fee balance is zero and the user has the fee balance.  The contract has the leftover.
        assertEq(FeeImpl(address(fee)).feeBalance(), 0);
        assertEq(_to.balance, _feeBalance);
        assertEq(address(fee).balance, _contractBalance - _feeBalance);
    }
}

// @dev A simplified Fee implementation using Native gas instead of ERC-20.
contract FeeImpl is Fee {
    uint256 public feeBalance;

    constructor(uint256 _fees) Fee() {
        feeBalance = _fees;
    }

    function _transferFrom(address _from, address _to, uint256 _amount) internal override returns (uint256) {
        require(_from == address(this), "FeeImpl: only self transfers allowed");
        require(address(this).balance >= _amount, "FeeImpl: insufficient balance");
        payable(_to).transfer(_amount);
        return _amount;
    }

    function _feeBalance() internal view override returns (uint256) {
        return feeBalance;
    }

    function getFeeBps(uint32 _dstEid) external view returns (uint16) {
        return _getFeeBps(_dstEid);
    }

    function withdrawFees(address _to) external override onlyOwner {
        uint256 balance = _feeBalance();
        feeBalance = 0;
        if (balance > 0) {
            _transferFrom(address(this), _to, balance);
        }
    }
}
