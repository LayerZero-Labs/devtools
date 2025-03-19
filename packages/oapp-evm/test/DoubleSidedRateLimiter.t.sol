// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test } from "forge-std/Test.sol";

import "../contracts/oapp/utils/DoubleSidedRateLimiter.sol";

contract DoubleSidedRateLimiterImpl is DoubleSidedRateLimiter {
    constructor() {}

    function setRateLimits(RateLimitConfig[] memory _rateLimitConfigs, RateLimitDirection _direction) external {
        _setRateLimits(_rateLimitConfigs, _direction);
    }

    function checkAndUpdateRateLimit(uint32 _eid, uint256 _amount, RateLimitDirection _direction) external {
        _checkAndUpdateRateLimit(_eid, _amount, _direction);
    }

    function inflow(uint32 _srcEid, uint256 _amount) external {
        _checkAndUpdateRateLimit(_srcEid, _amount, RateLimitDirection.Inbound);
    }

    function outflow(uint32 _dstEid, uint256 _amount) external {
        _checkAndUpdateRateLimit(_dstEid, _amount, RateLimitDirection.Outbound);
    }

    function resetRateLimits(uint32[] calldata _eids, RateLimitDirection _direction) external {
        _resetRateLimits(_eids, _direction);
    }

    function setRateLimitAccountingType(RateLimitAccountingType _rateLimitAccountingType) external {
        _setRateLimitAccountingType(_rateLimitAccountingType);
    }
}

contract DoubleSidedRateLimiterTest is Test {
    uint32 eidA = 1;

    uint256 limit = 100 ether;
    uint48 window = 1 hours;

    uint256 amountInFlight;
    uint256 amountCanBeSent;
    uint256 amountCanBeReceived;

    DoubleSidedRateLimiterImpl rateLimiter;

    function setUp() public virtual {
        vm.warp(0);
        rateLimiter = new DoubleSidedRateLimiterImpl();
        
        // Set up outbound rate limits
        DoubleSidedRateLimiter.RateLimitConfig[] memory outboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        outboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({ eid: eidA, limit: limit, window: window });
        rateLimiter.setRateLimits(outboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        // Set up inbound rate limits
        DoubleSidedRateLimiter.RateLimitConfig[] memory inboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        inboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({ eid: eidA, limit: limit, window: window });
        rateLimiter.setRateLimits(inboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Inbound);
    }

    function test_max_outbound_rate_limit() public {
        rateLimiter.outflow(eidA, limit);
        
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, limit);
        assertEq(amountCanBeSent, 0);
    }

    function test_max_inbound_rate_limit() public {
        rateLimiter.inflow(eidA, limit);
        
        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, limit);
        assertEq(amountCanBeReceived, 0);
    }

    function test_net_rate_limits_with_amounts_equal_to_limits() public {
        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Net);

        // Use full outbound capacity
        rateLimiter.outflow(eidA, limit);
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, limit);
        assertEq(amountCanBeSent, 0);

        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeReceived, limit);
        
        // Should still be able to receive inbound
        rateLimiter.inflow(eidA, limit);

        // Verify outbound is offset by the inbound
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountCanBeSent, limit);
        assertEq(amountInFlight, 0);

        // Verify inbound is maxed
        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountCanBeReceived, 0);
        assertEq(amountInFlight, limit);

        rateLimiter.outflow(eidA, limit);

        // Verify inbound is offset by the outbound
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountCanBeSent, 0);
        assertEq(amountInFlight, limit);

        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountCanBeReceived, limit);
        assertEq(amountInFlight, 0);
    }

    function test_gross_rate_limits_with_amounts_equal_to_limits() public {
        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Gross);

        // Use full outbound capacity
        rateLimiter.outflow(eidA, limit);
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, limit);
        assertEq(amountCanBeSent, 0);

        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeReceived, limit);
        
        // Should still be able to receive inbound
        rateLimiter.inflow(eidA, limit);

        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountCanBeSent, 0);
        assertEq(amountInFlight, limit);

        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountCanBeReceived, 0);
        assertEq(amountInFlight, limit);

        vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
        rateLimiter.outflow(eidA, limit);

        vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
        rateLimiter.inflow(eidA, limit);
    }

    function test_reset_net_rate_limits() public {
        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Net);

        uint256 outflowAmount = limit / 2;
        uint256 inflowAmount = limit / 4;

        // Use some capacity
        rateLimiter.outflow(eidA, outflowAmount);
        rateLimiter.inflow(eidA, inflowAmount);

        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, outflowAmount - inflowAmount);
        assertEq(amountCanBeSent, limit - (outflowAmount - inflowAmount));

        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, inflowAmount);
        assertEq(amountCanBeReceived, limit - inflowAmount);

        // Reset the outbound rate limits
        uint32[] memory eids = new uint32[](1);
        eids[0] = eidA;
        rateLimiter.resetRateLimits(eids, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        // Verify outbound rate limits are cleared
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeSent, limit);

        // Verify inbound rate limits are not affected
        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, inflowAmount);
        assertEq(amountCanBeReceived, limit - inflowAmount);

        // Reset the inbound rate limits
        rateLimiter.resetRateLimits(eids, DoubleSidedRateLimiter.RateLimitDirection.Inbound);

        // Verify inbound rate limits are cleared
        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeReceived, limit);
    }

    function test_reset_gross_rate_limits() public {
        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Gross);

        // Use some capacity
        rateLimiter.outflow(eidA, limit / 2);
        rateLimiter.inflow(eidA, limit / 2);

        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, limit / 2);
        assertEq(amountCanBeSent, limit / 2);

        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, limit / 2);
        assertEq(amountCanBeReceived, limit / 2);

        // Reset the outbound rate limits
        uint32[] memory eids = new uint32[](1);
        eids[0] = eidA;
        rateLimiter.resetRateLimits(eids, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        // Verify outbound rate limits are cleared
        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeSent, limit);

        // Verify inbound rate limits are not affected
        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, limit / 2);
        assertEq(amountCanBeReceived, limit / 2);

        // Reset the inbound rate limits
        rateLimiter.resetRateLimits(eids, DoubleSidedRateLimiter.RateLimitDirection.Inbound);

        // Verify inbound rate limits are cleared
        (amountInFlight, amountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeReceived, limit);
    }

    function test_change_accounting_type() public {
        // Start with Net accounting (default)
        rateLimiter.outflow(eidA, limit / 2);
        
        // Change to Gross accounting
        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Gross);
        
        // Reset limits after changing accounting type
        uint32[] memory eids = new uint32[](1);
        eids[0] = eidA;
        rateLimiter.resetRateLimits(eids, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        rateLimiter.outflow(eidA, limit);
        
        rateLimiter.inflow(eidA, limit);
        
        // This should fail as we've hit the gross limit
        vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
        rateLimiter.outflow(eidA, limit);
    }

    function test_rate_limit_window_decay() public {
        rateLimiter.outflow(eidA, limit / 2);
        
        skip(window / 4);

        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountCanBeSent, limit - limit / 4);
        assertEq(amountInFlight, limit / 4);

        skip(window);

        (amountInFlight, amountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        assertEq(amountCanBeSent, limit);
        assertEq(amountInFlight, 0);
    }

    function test_over_rate_limit() public {
        vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
        rateLimiter.outflow(eidA, limit + 1);

        vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
        rateLimiter.inflow(eidA, limit + 1);
    }

    function test_rate_limit_resets_after_window() public {
        rateLimiter.outflow(eidA, limit);
        vm.warp(block.timestamp + window + 1);
        rateLimiter.outflow(eidA, limit);

        rateLimiter.inflow(eidA, limit);
        vm.warp(block.timestamp + window + 1);
        rateLimiter.inflow(eidA, limit);
    }
} 