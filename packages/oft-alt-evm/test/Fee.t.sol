// SPDX-LICENSE-IDENTIFIER: UNLICENSED

pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFee } from "../contracts/interfaces/IFee.sol";
import { Fee } from "../contracts/Fee.sol";

contract FeeTest is Test {
    address internal feeImplOwner = makeAddr("feeImplOwner");

    function test_setDefaultFeeBps(uint16 _feeBps) public {
        // 1. Set up the test.
        Fee fee = new FeeImpl(0, feeImplOwner);

        if (_feeBps > fee.BPS_DENOMINATOR()) {
            // 2a. Test revert if the fee is too high
            vm.expectRevert(IFee.InvalidBps.selector);
            vm.prank(feeImplOwner);
            fee.setDefaultFeeBps(_feeBps);
        } else {
            // 2b. Test the success condition.
            vm.prank(feeImplOwner);
            fee.setDefaultFeeBps(_feeBps);
            assertEq(fee.defaultFeeBps(), _feeBps);
        }
    }

    function test_setFeeBps(uint16 _defaultFeeBps, uint32 _dstEid, uint16 _feeBps, bool _enabled) public {
        // 1. Set up the test including some default fee
        Fee fee = new FeeImpl(0, feeImplOwner);
        vm.assume(_defaultFeeBps < fee.BPS_DENOMINATOR());
        vm.prank(feeImplOwner);
        fee.setDefaultFeeBps(_defaultFeeBps);
        assertEq(fee.defaultFeeBps(), _defaultFeeBps);

        if (_feeBps > fee.BPS_DENOMINATOR()) {
            // 2a. Test revert if the fee is too high
            vm.prank(feeImplOwner);
            vm.expectRevert(IFee.InvalidBps.selector);
            fee.setFeeBps(_dstEid, _feeBps, _enabled);
        } else {
            // 2b. Test the success condition.
            vm.prank(feeImplOwner);
            fee.setFeeBps(_dstEid, _feeBps, _enabled);
            (uint16 actualFeeBps, bool actualEnabled) = fee.feeBps(_dstEid);
            assertEq(actualFeeBps, _feeBps);
            assertEq(actualEnabled, _enabled);
            assertEq(FeeImpl(address(fee)).getFeeBps(_dstEid), _enabled ? _feeBps : _defaultFeeBps);
        }
    }
}

// @dev A simplified Fee implementation using Native gas instead of ERC-20.
contract FeeImpl is Fee {
    uint256 public feeBalance;

    constructor(uint256 _fees, address _feeImplOwner) Fee() Ownable(_feeImplOwner) {
        feeBalance = _fees;
    }

    function getFeeBps(uint32 _dstEid) external view returns (uint16) {
        return _getFeeBps(_dstEid);
    }
}
