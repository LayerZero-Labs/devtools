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

    function test_fuzz_outflow(uint256 amount1, uint256 amount2, uint256 timeSkip) public {
        amount1 = bound(amount1, 0, limit);
        amount2 = bound(amount2, 0, limit);
        timeSkip = bound(timeSkip, 0, 2 * window);

        rateLimiter.outflow(eidA, amount1);
        
        skip(timeSkip);

        (uint256 actualAmountInFlight, uint256 actualAmountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);

        if (timeSkip >= window) {
            assertEq(actualAmountInFlight, 0);
            assertEq(actualAmountCanBeSent, limit);
        } else {
            assertTrue(actualAmountInFlight <= amount1);
            assertEq(actualAmountCanBeSent, limit - actualAmountInFlight);
        }

        if (amount2 <= actualAmountCanBeSent) {
            rateLimiter.outflow(eidA, amount2);
            (uint256 newAmountInFlight,) = rateLimiter.getAmountCanBeSent(eidA);
            assertTrue(newAmountInFlight <= limit, "Total amount exceeds limit");
        } else {
            vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
            rateLimiter.outflow(eidA, amount2);
        }
    }

    function test_fuzz_inflow(uint256 amount1, uint256 amount2, uint256 timeSkip) public {
        amount1 = bound(amount1, 0, limit);
        amount2 = bound(amount2, 0, limit);
        timeSkip = bound(timeSkip, 0, 2 * window);

        rateLimiter.inflow(eidA, amount1);

        skip(timeSkip);

        (uint256 actualAmountInFlight, uint256 actualAmountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);

        if (timeSkip >= window) {
            assertEq(actualAmountInFlight, 0);
            assertEq(actualAmountCanBeReceived, limit);
        } else {
            assertTrue(actualAmountInFlight <= amount1);
            assertEq(actualAmountCanBeReceived, limit - actualAmountInFlight);
        }

        if (amount2 <= actualAmountCanBeReceived) {
            rateLimiter.inflow(eidA, amount2);
        } else {
            vm.expectRevert(abi.encodeWithSelector(DoubleSidedRateLimiter.RateLimitExceeded.selector));
            rateLimiter.inflow(eidA, amount2);
        }
    }

    function test_fuzz_net_rate_limits(uint256 amount1, uint256 amount2, uint256 timeSkip) public {
        amount1 = bound(amount1, 0, limit);
        amount2 = bound(amount2, 0, limit);
        timeSkip = bound(timeSkip, 0, 2 * window);

        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Net);

        rateLimiter.outflow(eidA, amount1);
        rateLimiter.inflow(eidA, amount2);

        (uint256 actualOutboundAmountInFlight, uint256 actualOutboundAmountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        (uint256 actualInboundAmountInFlight, uint256 actualInboundAmountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);

        if (amount1 > amount2) {
            assertEq(actualOutboundAmountInFlight, amount1 - amount2);
            assertEq(actualOutboundAmountCanBeSent, limit - (amount1 - amount2));
        } else {
            assertEq(actualOutboundAmountInFlight, 0);
            assertEq(actualOutboundAmountCanBeSent, limit);

            assertEq(actualInboundAmountInFlight, amount2);
            assertEq(actualInboundAmountCanBeReceived, limit - amount2);
        }

        skip(timeSkip);

        (actualOutboundAmountInFlight, actualOutboundAmountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        (actualInboundAmountInFlight, actualInboundAmountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);

        if (amount1 > amount2) {
            assertTrue(actualOutboundAmountInFlight <= amount1 - amount2);
            assertTrue(actualOutboundAmountCanBeSent >= limit - actualOutboundAmountInFlight);

            assertTrue(actualInboundAmountInFlight <= amount2);
            assertEq(actualInboundAmountCanBeReceived, limit - actualInboundAmountInFlight);
        } else {
            assertEq(actualOutboundAmountInFlight, 0);
            assertEq(actualOutboundAmountCanBeSent, limit);

            assertTrue(actualInboundAmountInFlight <= amount2);
            assertEq(actualInboundAmountCanBeReceived, limit - actualInboundAmountInFlight);
        }
    }

    function test_fuzz_gross_rate_limits(uint256 amount1, uint256 amount2, uint256 timeSkip) public {
        amount1 = bound(amount1, 0, limit);
        amount2 = bound(amount2, 0, limit);
        timeSkip = bound(timeSkip, 0, 2 * window);

        rateLimiter.setRateLimitAccountingType(DoubleSidedRateLimiter.RateLimitAccountingType.Gross);

        rateLimiter.outflow(eidA, amount1);
        rateLimiter.inflow(eidA, amount2);

        (uint256 actualOutboundAmountInFlight, uint256 actualOutboundAmountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        (uint256 actualInboundAmountInFlight, uint256 actualInboundAmountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);

        assertEq(actualOutboundAmountInFlight, amount1);
        assertEq(actualOutboundAmountCanBeSent, limit - amount1);
   
        assertEq(actualInboundAmountInFlight, amount2);
        assertEq(actualInboundAmountCanBeReceived, limit - amount2);

        skip(timeSkip);

        (actualOutboundAmountInFlight, actualOutboundAmountCanBeSent) = rateLimiter.getAmountCanBeSent(eidA);
        (actualInboundAmountInFlight, actualInboundAmountCanBeReceived) = rateLimiter.getAmountCanBeReceived(eidA);

        if (timeSkip >= window) {
            assertEq(actualOutboundAmountInFlight, 0);
            assertEq(actualOutboundAmountCanBeSent, limit);

            assertEq(actualInboundAmountInFlight, 0);
            assertEq(actualInboundAmountCanBeReceived, limit);
        } else {
            assertTrue(actualOutboundAmountInFlight <= amount1);
            assertEq(actualOutboundAmountCanBeSent, limit - actualOutboundAmountInFlight);

            assertTrue(actualInboundAmountInFlight <= amount2);
        }
    }
} 