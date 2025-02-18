// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { Test } from "forge-std/Test.sol";
import "../contracts/oapp/utils/RateLimiter.sol";

contract RateLimiterImpl is RateLimiter {
    constructor() {}

    function setRateLimits(RateLimitConfig[] memory _rateLimitConfigs) external {
        _setRateLimits(_rateLimitConfigs);
    }

    function outflow(uint32 _dstEid, uint256 _amount) external {
        _outflow(_dstEid, _amount);
    }

    function inflow(uint32 _srcEid, uint256 _amount) external {
        _inflow(_srcEid, _amount);
    }
}

contract RateLimiterTest is RateLimiterImpl, Test {
    uint32 dstEid = 1;
    uint256 sendLimit = 100 ether;
    uint256 window = 1 hours;
    uint256 amountInFlight;
    uint256 amountCanBeSent;
    RateLimiterImpl rateLimiterImpl;

    function setUp() public virtual {
        vm.warp(0);
        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](1);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig(dstEid, sendLimit, window);

        rateLimiterImpl = new RateLimiterImpl();
        rateLimiterImpl.setRateLimits(rateLimitConfigs);
    }

    function test_max_rate_limit() public {
        rateLimiterImpl.outflow(dstEid, sendLimit);
    }

    function _setRateLimit(uint32 _dstEid, uint256 _limit, uint256 _window) internal {
        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](1);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig(_dstEid, _limit, _window);
        rateLimiterImpl.setRateLimits(rateLimitConfigs);
    }

    function test_inflights_during_window_reduction() public {
        _setRateLimit(dstEid, 100, 100);
        rateLimiterImpl.outflow(dstEid, 100);
        _setRateLimit(dstEid, 40, 60);

        vm.warp(60 seconds);

        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, 60);
        assertEq(amountCanBeSent, 0);
    }

    function test_over_max_rate_limit() public {
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, 101 ether);
    }

    function test_rate_limit_resets_after_window() public {
        rateLimiterImpl.outflow(dstEid, sendLimit);
        vm.warp(block.timestamp + 1 hours + 1 seconds);
        rateLimiterImpl.outflow(dstEid, sendLimit);
    }

    function test_rate_limit_inflow_deducts_from_outflow() public {
        // Send max limit
        vm.warp(0);
        rateLimiterImpl.outflow(dstEid, sendLimit);

        // Verify max in flight
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit);
        assertEq(amountCanBeSent, 0);

        // Inflow some amount
        rateLimiterImpl.inflow(dstEid, sendLimit / 2);

        // Verify amountInFlight/amountCanBeSent is half the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 2);
        assertEq(amountCanBeSent, sendLimit / 2);
    }

    function test_rate_limit_inflow_deducts_from_outflow_exceeds_amount_in_flight() public {
        // Send max limit
        vm.warp(0);
        rateLimiterImpl.outflow(dstEid, sendLimit);

        // Verify max in flight
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit);
        assertEq(amountCanBeSent, 0);

        // Inflow some amount that exceeds the current amount in flight
        rateLimiterImpl.inflow(dstEid, sendLimit + 1);

        // Verify amount in flight reset to 0
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeSent, sendLimit);
    }

    function test_multiple_rate_limit_windows() public {
        uint16[10] memory times = [1, 11, 233, 440, 666, 667, 778, 999, 1000, 3600];
        uint256 decay = 0;
        rateLimiterImpl.outflow(dstEid, sendLimit);
        for (uint256 i = 0; i < 10; i++) {
            decay = (sendLimit * times[i]) / window;
            vm.warp(times[i]);
            (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
            assertEq(amountInFlight, decay < sendLimit ? sendLimit - decay : 0);
            assertEq(amountCanBeSent, decay < sendLimit ? decay : sendLimit);
        }
    }

    function test_rate_change_mid_window() public {
        // Make sure you can send max limit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, 0);
        assertEq(amountCanBeSent, sendLimit);

        // Send max limit
        vm.warp(0);
        rateLimiterImpl.outflow(dstEid, sendLimit);

        // Verify max in flight
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit);
        assertEq(amountCanBeSent, 0);

        // Expect revert when max in flight
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, sendLimit);

        // Advance halfway through window
        vm.warp(1800);

        // Verify amountInFlight/amountCanBeSent is half the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 2);
        assertEq(amountCanBeSent, sendLimit / 2);

        // update sendLimit to 2x
        uint256 newLimit = 200 ether;
        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](1);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig(dstEid, newLimit, window);
        rateLimiterImpl.setRateLimits(rateLimitConfigs);

        // Verify amountInFlight is still half the sendLimit
        // Verify amountCanBeSent is the newLimit - half the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 2);
        assertEq(amountCanBeSent, newLimit - sendLimit / 2);

        // Advance rest of the window
        vm.warp(3600);

        // Verify new max limit can be sent
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Expect revert when max in flight
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, 1 ether);
    }

    function test_window_change_mid_window() public {
        // Send max limit
        vm.warp(0);
        rateLimiterImpl.outflow(dstEid, sendLimit);
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit);
        assertEq(amountCanBeSent, 0);

        // Advance 30 mins
        vm.warp(1800);

        // Verify amountInFlight/amountCanBeSent is half the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 2);
        assertEq(amountCanBeSent, sendLimit / 2);

        // Update window to be 2x longer.
        uint256 newWindow = 2 hours;
        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](1);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig(dstEid, sendLimit, newWindow);
        rateLimiterImpl.setRateLimits(rateLimitConfigs);

        // Verify amountInFlight/amountCanBeSent is still half the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 2);
        assertEq(amountCanBeSent, sendLimit / 2);

        // Expect anything more that half the sendLimit to revert
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, sendLimit / 2 + 1 ether);

        // Advance another 30 mins
        vm.warp(3600);

        // Verify amountInFlight is still 1/4 the sendLimit
        // Verify amountCanBeSent is 3/4 the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 4);
        assertEq(amountCanBeSent, sendLimit - sendLimit / 4);

        // Advance another past the window
        vm.warp(5400);

        // Verify max limit can be sent
        rateLimiterImpl.outflow(dstEid, sendLimit);

        // Advance old window and make sure you cant send max limit because of newly set window
        vm.warp(9000);
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, sendLimit);
    }

    function test_rate_and_window_change_mid_window() public {
        // Send max limit
        vm.warp(0);
        rateLimiterImpl.outflow(dstEid, sendLimit);
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit);
        assertEq(amountCanBeSent, 0);

        // Advance 30 mins
        vm.warp(1800);

        // Verify amountInFlight/amountCanBeSent is half the sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, sendLimit / 2);
        assertEq(amountCanBeSent, sendLimit / 2);

        // Update limit to 2x and window to 4x.
        uint256 newLimit = 200 ether;
        uint256 newWindow = 4 hours;
        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](1);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig(dstEid, newLimit, newWindow);
        rateLimiterImpl.setRateLimits(rateLimitConfigs);

        // The amountInFlight should be a 1/4 of the newLimit because the new rate limit provides capacity for 50 ETH/hour
        // We sent 100 ETH an hour before the update. So one hour after the update, half of this capacity (50 ETH) is considered still in use

        // Verify amountInFlight is still half the sendLimit
        // Verify amountCanBeSent is the newLimit - half the sendLimit
        uint amountInFlightBeforeUpdate = sendLimit / 2;
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, amountInFlightBeforeUpdate);
        assertEq(amountCanBeSent, newLimit - amountInFlightBeforeUpdate);

        // Advance another 30 mins
        vm.warp(3600);

        // Verify amountInFlight is 1/4 the old sendLimit
        // Verify amountCanBeSent is newLimit - 1/4 the old sendLimit
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        assertEq(amountInFlight, amountInFlightBeforeUpdate / 2);
        assertEq(amountCanBeSent, newLimit - amountInFlightBeforeUpdate / 2);

        // Advance another 30 mins
        vm.warp(5400);
        // Verify new max limit can be sent
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Verify max amount cant be sent for the rest of the window (4 hours left in window)
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Advance another 60 mins
        vm.warp(9000);
        // Verify max amount cant be sent for the rest of the window (3 hours left in window)
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Advance another 60 mins
        vm.warp(12600);
        // Verify max amount cant be sent for the rest of the window (2 hours left in window)
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Advance another 60 mins
        vm.warp(16200);
        // Verify max amount cant be sent for the rest of the window (1 hours left in window)
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Advance another 60 mins
        vm.warp(19800);
        (amountInFlight, amountCanBeSent) = rateLimiterImpl.getAmountCanBeSent(dstEid);
        // Verify max amount can be sent when new window starts
        rateLimiterImpl.outflow(dstEid, newLimit);

        // Verify max inflight and cant send anymore at this point in time
        vm.expectRevert(abi.encodeWithSelector(RateLimiter.RateLimitExceeded.selector));
        rateLimiterImpl.outflow(dstEid, 1 ether);
    }
}
