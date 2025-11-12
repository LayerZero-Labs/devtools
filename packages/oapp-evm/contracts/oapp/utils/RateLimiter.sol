// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RateLimiter
 * @dev Abstract contract for implementing rate limiting functionality. This contract provides a basic framework for
 * rate limiting how often a function can be executed. It is designed to be inherited by other contracts requiring rate
 * limiting capabilities to protect resources or services from excessive use.
 * @dev The ordering of transactions within a given block (timestamp) affects the consumed capacity.
 * @dev Carefully consider the minimum window duration for the given blockchain.  For example, on Ethereum, the minimum
 * window duration should be at least 12 seconds.  If a window less than 12 seconds is configured, then the rate limit
 * will effectively reset with each block, rendering rate limiting ineffective.
 * @dev Carefully consider the proportion of the limit to the window.  If the limit is much smaller than the window, the
 * decay function is lossy.  Consider using a limit that is greater than or equal to the window to avoid this.  This is
 * especially important for blockchains with short average block times.
 *
 * Example 1: Max rate limit reached at beginning of window. As time continues the amount of in flights comes down.
 *
 * Rate Limit Config:
 *   limit: 100 units
 *   window: 60 seconds
 *
 *                              Amount in Flight (units) vs. Time Graph (seconds)
 *
 *      100 | * - (Max limit reached at beginning of window)
 *          |   *
 *          |     *
 *          |       *
 *       50 |         * (After 30 seconds only 50 units in flight)
 *          |           *
 *          |             *
 *          |               *
 *       0  +--|---|---|---|---|-->(After 60 seconds 0 units are in flight)
 *             0  15  30  45  60 (seconds)
 *
 * Example 2: Max rate limit reached at beginning of window. As time continues the amount of in flights comes down
 * allowing for more to be sent. At the 90 second mark, more in flights come in.
 *
 * Rate Limit Config:
 *   limit: 100 units
 *   window: 60 seconds
 *
 *                              Amount in Flight (units) vs. Time Graph (seconds)
 *
 *      100 | * - (Max limit reached at beginning of window)
 *          |   *
 *          |     *
 *          |       *
 *       50 |         *          * (50 inflight)
 *          |           *          *
 *          |             *          *
 *          |               *          *
 *        0  +--|--|--|--|--|--|--|--|--|--> Time
 *              0 15 30 45 60 75 90 105 120  (seconds)
 *
 * Example 3: Max rate limit reached at beginning of window. At the 15 second mark, the window gets updated to 60
 * seconds and the limit gets updated to 50 units. This scenario shows the direct depiction of "in flight" from the
 * previous window affecting the current window.
 *
 * Initial Rate Limit Config: For first 15 seconds
 *   limit: 100 units
 *   window: 30 seconds
 *
 * Updated Rate Limit Config: Updated at 15 second mark
 *   limit: 50 units
 *   window: 60 seconds
 *
 *                              Amount in Flight (units) vs. Time Graph (seconds)
 *      100 - *
 *            |*
 *            | *
 *            |  *
 *            |   *
 *            |    *
 *            |     *
 *       75 - |      *
 *            |       *
 *            |        *
 *            |         *
 *            |          *
 *            |           *
 *            |            *
 *            |             *
 *       50 - |              𐫰 <--(Slope changes at the 15 second mark because of the update.
 *            |               ✧ *      Window extended to 60 seconds and limit reduced to 50 units.
 *            |                ✧ ︎   *      Because amountInFlight/lastUpdated do not reset, 50 units are
 *            |                 ✧       *      considered in flight from the previous window and the corresponding
 *            |                  ✧ ︎          *     decay from the previous rate.)
 *            |                   ✧              *
 *       25 - |                    ✧                 *
 *            |                     ✧                    *
 *            |                      ✧                        *
 *            |                       ✧                           *
 *            |                        ✧                              *
 *            |                         ✧                                  *
 *            |                          ✧                                     *
 *            |                           ✧                                        *
 *        0 - +---|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----> Time
 *            0   5    10   15   20   25   30   35   40   45   50   55   60   65   70   75   80   85   90 (seconds)
 *            [  Initial 30 Second Window  ]
 *                          [ --------------- Extended 60 Second Window --------------- ]
 */
abstract contract RateLimiter {

    /**
     * @notice Rate Limit struct.
     * @param amountInFlight The amount in the current window.
     * @param lastUpdated Timestamp representing the last time the rate limit was checked or updated.
     * @param limit This represents the maximum allowed amount within a given window.
     * @param window Defines the duration of the rate limiting window.
     */
    struct RateLimit {
        uint192 amountInFlight;
        uint64 lastUpdated;
        uint192 limit;
        uint64 window;
    }

    /**
     * @notice Rate Limit Configuration struct.
     * @param dstEid The destination endpoint id.
     * @param limit This represents the maximum allowed amount within a given window.
     * @param window Defines the duration of the rate limiting window.
     */
    struct RateLimitConfig {
        uint32 dstEid;
        uint192 limit;
        uint64 window;
    }

    /**
     * @dev Mapping from destination endpoint id to RateLimit Configurations.
     */
    mapping(uint32 dstEid => RateLimit limit) public rateLimits;

    /**
     * @notice Emitted when _setRateLimits occurs.
     * @param rateLimitConfigs An array of `RateLimitConfig` structs representing the rate limit configurations set.
     * - `dstEid`: The destination endpoint id.
     * - `limit`: This represents the maximum allowed amount within a given window.
     * - `window`: Defines the duration of the rate limiting window.
     */
    event RateLimitsChanged(RateLimitConfig[] rateLimitConfigs);

    /**
     * @notice Emitted when _resetRateLimits occurs.
     * @param eids The endpoint ids that were reset.
     */
    event RateLimitsReset(uint32[] eids);

    /**
     * @notice Error that is thrown when an amount exceeds the rate_limit.
     */
    error RateLimitExceeded();

    /**
     * @notice Get the current amount that can be sent to this destination endpoint id for the given rate limit window.
     * @param _dstEid The destination endpoint id.
     * @return currentAmountInFlight The current amount that was sent.
     * @return amountCanBeSent The amount that can be sent.
     */
    function getAmountCanBeSent(
        uint32 _dstEid
    ) external view virtual returns (uint256 currentAmountInFlight, uint256 amountCanBeSent) {
        RateLimit memory rl = rateLimits[_dstEid];
        return _amountCanBeSent(rl.amountInFlight, rl.lastUpdated, rl.limit, rl.window);
    }

    /**
     * @notice Sets the Rate Limit.
     * @param _rateLimitConfigs A `RateLimitConfig` struct representing the rate limit configuration.
     * - `dstEid`: The destination endpoint id.
     * - `limit`: This represents the maximum allowed amount within a given window.
     * - `window`: Defines the duration of the rate limiting window.
     */
    function _setRateLimits(RateLimitConfig[] memory _rateLimitConfigs) internal virtual {
        unchecked {
            for (uint256 i = 0; i < _rateLimitConfigs.length; i++) {
                RateLimit storage rl = rateLimits[_rateLimitConfigs[i].dstEid];

                // @dev Ensure we checkpoint the existing rate limit as to not retroactively apply the new decay rate.
                _outflow(_rateLimitConfigs[i].dstEid, 0);

                // @dev Does NOT reset the amountInFlight/lastUpdated of an existing rate limit.
                rl.limit = _rateLimitConfigs[i].limit;
                rl.window = _rateLimitConfigs[i].window;
            }
        }
        emit RateLimitsChanged(_rateLimitConfigs);
    }

    /**
     * @notice Resets the rate limits (sets amountInFlight to 0) for the given endpoint ids.
     * @param _eids The endpoint ids to reset the rate limits for.
     */
    function _resetRateLimits(uint32[] memory _eids) internal virtual {
        for (uint256 i = 0; i < _eids.length; i++) {
            RateLimit storage rateLimit = rateLimits[_eids[i]];

            rateLimit.amountInFlight = 0;
            rateLimit.lastUpdated = uint64(block.timestamp);
        }
        emit RateLimitsReset(_eids);
    }

    /**
     * @notice Checks current amount in flight and amount that can be sent for a given rate limit window.
     * @param _amountInFlight The amount in the current window.
     * @param _lastUpdated Timestamp representing the last time the rate limit was checked or updated.
     * @param _limit This represents the maximum allowed amount within a given window.
     * @param _window Defines the duration of the rate limiting window.
     * @return currentAmountInFlight The amount in the current window.
     * @return amountCanBeSent The amount that can be sent.
     */
    function _amountCanBeSent(
        uint192 _amountInFlight,
        uint64 _lastUpdated,
        uint192 _limit,
        uint64 _window
    ) internal view virtual returns (uint256 currentAmountInFlight, uint256 amountCanBeSent) {
        uint256 timeSinceLastDeposit = block.timestamp - _lastUpdated;
        // @dev Presumes linear decay.
        uint256 decay = (_limit * timeSinceLastDeposit) / (_window > 0 ? _window : 1); // prevent division by zero
        currentAmountInFlight = uint192(_amountInFlight <= decay ? 0 : _amountInFlight - decay);
        // @dev In the event the _limit is lowered, and the 'in-flight' amount is higher than the _limit, set to 0.
        amountCanBeSent = _limit <= currentAmountInFlight ? 0 : _limit - currentAmountInFlight;
    }

    /**
     * @notice Verifies whether the specified amount falls within the rate limit constraints for the targeted
     * endpoint ID. On successful verification, it updates amountInFlight and lastUpdated. If the amount exceeds
     * the rate limit, the operation reverts.
     * @param _dstEid The destination endpoint id.
     * @param _amount The amount to check for rate limit constraints.
     */
    function _outflow(uint32 _dstEid, uint256 _amount) internal virtual {
        // @dev By default dstEid that have not been explicitly set will return amountCanBeSent == 0.
        RateLimit storage rl = rateLimits[_dstEid];

        (uint256 currentAmountInFlight, uint256 amountCanBeSent) = _amountCanBeSent(
            rl.amountInFlight,
            rl.lastUpdated,
            rl.limit,
            rl.window
        );
        if (_amount > amountCanBeSent) revert RateLimitExceeded();

        // @dev Update the storage to contain the new amount and current timestamp.
        rl.amountInFlight = uint192(currentAmountInFlight + _amount);
        rl.lastUpdated = uint64(block.timestamp);
    }

    /**
     * @notice To be used when you want to calculate your rate limits as a function of net outbound AND inbound.
     * ie. If you move 150 out, and 100 in, you effective inflight should be 50.
     * Does not need to update decay values, as the inflow is effective immediately.
     * @param _srcEid The source endpoint id.
     * @param _amount The amount to inflow back and deduct from amountInFlight.
     */
    function _inflow(uint32 _srcEid, uint256 _amount) internal virtual {
        RateLimit storage rl = rateLimits[_srcEid];
        rl.amountInFlight = uint192(_amount >= rl.amountInFlight ? 0 : rl.amountInFlight - _amount);
    }
}
