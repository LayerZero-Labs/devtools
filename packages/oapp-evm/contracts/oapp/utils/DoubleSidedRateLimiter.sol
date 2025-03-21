// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DoubleSidedRateLimiter
 * @dev Abstract contract for implementing net and gross rate limiting functionality.
 * @dev The owner can toggle between net and gross accounting by calling `_setRateLimitAccountingType`.
 * ---------------------------------------------------------------------------------------------------------------------
 * Net accounting effectively allows two operations to offset each other's net impact (e.g., inflow v.s. outflow of assets). 
 * A flexible rate limit that grows during congestive periods and shrinks during calm periods could give some
 * leeway when someone tries to forcefully congest the network, while still preventing huge amounts to be sent at once.
 * ---------------------------------------------------------------------------------------------------------------------
 * Gross accounting does not allow any offsetting and will revert if the amount to be sent or received is greater than the available capacity.
 * The contract is designed to be inherited by other contracts requiring rate limiting capabilities to protect resources or services from excessive use.
 */
abstract contract DoubleSidedRateLimiter {

    /**
     * @notice Rate Limit struct
     * @param lastUpdated Timestamp representing the last time the rate limit was checked or updated.
     * @param window Defines the duration of the rate limiting window.
     * @param amountInFlight Current amount within the rate limit window.
     * @param limit This represents the maximum allowed amount within a given window.
     */
    struct RateLimit {
        uint128 lastUpdated;    // 16 bytes
        uint48 window;          // 6 bytes
        uint256 amountInFlight; // 32 bytes (new slot)
        uint256 limit;          // 32 bytes (new slot)
    }

    /**
     * @notice Rate Limit Configuration struct.
     * @param eid The endpoint id.
     * @param window Defines the duration of the rate limiting window.
     * @param limit This represents the maximum allowed amount within a given window.
     */
    struct RateLimitConfig {
        uint32 eid;      // 4 bytes
        uint48 window;   // 6 bytes
        uint256 limit;   // 32 bytes (new slot)
    }

    // Define an enum to clearly distinguish between inbound and outbound rate limits.
    enum RateLimitDirection {
        Inbound,
        Outbound
    }

    enum RateLimitAccountingType {
        Net,
        Gross
    }

    /**
     * @notice Emitted when _setRateLimits occurs.
     * @param rateLimitConfigs An array of `RateLimitConfig` structs representing the rate limit configurations set per endpoint id.
     * - `eid`: The source / destination endpoint id (depending on direction).
     * - `window`: Defines the duration of the rate limiting window.
     * - `limit`: This represents the maximum allowed amount within a given window.
     * @param direction Specifies whether the outbound or inbound rates were changed.
     */
    event RateLimitsChanged(RateLimitConfig[] rateLimitConfigs, RateLimitDirection direction);

    event RateLimitAccountingTypeSet(RateLimitAccountingType newRateLimitAccountingType);
    event RateLimitsReset(uint32[] eids, RateLimitDirection direction);

    /**
     * @notice Error that is thrown when an amount exceeds the rate limit for a given direction.
     */
    error RateLimitExceeded();

    RateLimitAccountingType public rateLimitAccountingType;

    // Tracks rate limits for outbound transactions to a dstEid.
    mapping(uint32 => RateLimit) public outboundRateLimits;
    // Tracks rate limits for inbound transactions from a srcEid.
    mapping(uint32 => RateLimit) public inboundRateLimits;

    /**
     * @notice Get the current amount that can be sent to this destination endpoint id for the given rate limit window.
     * @param _dstEid The destination endpoint id.
     * @return currentAmountInFlight The current amount that was sent in this window.
     * @return amountCanBeSent The amount that can be sent.
     */
    function getAmountCanBeSent(
        uint32 _dstEid
    ) external view virtual returns (uint256 currentAmountInFlight, uint256 amountCanBeSent) {
        RateLimit storage orl = outboundRateLimits[_dstEid];
        return _amountCanBeSent(orl.amountInFlight, orl.lastUpdated, orl.limit, orl.window);
    }

    /**
     * @notice Get the current amount that can be received from the source endpoint id for the given rate limit window.
     * @param _srcEid The source endpoint id.
     * @return currentAmountInFlight The current amount that has been received in this window.
     * @return amountCanBeReceived The amount that can be received.
     */
    function getAmountCanBeReceived(
        uint32 _srcEid
    ) external view virtual returns (uint256 currentAmountInFlight, uint256 amountCanBeReceived) {
        RateLimit storage irl = inboundRateLimits[_srcEid];
        return _amountCanBeReceived(irl.amountInFlight, irl.lastUpdated, irl.limit, irl.window);
    }

    /**
     * @notice Sets the rate limits.
     * @param _rateLimitConfigs A `RateLimitConfig[]` array representing the rate limit configurations for either outbound or inbound.
     * @param _direction Indicates whether the rate limits being set are for outbound or inbound.
     */
    function _setRateLimits(RateLimitConfig[] memory _rateLimitConfigs, RateLimitDirection _direction) internal virtual {
        unchecked {
            for (uint256 i = 0; i < _rateLimitConfigs.length; i++) {
                RateLimit storage rateLimit = _direction == RateLimitDirection.Outbound
                    ? outboundRateLimits[_rateLimitConfigs[i].eid]
                    : inboundRateLimits[_rateLimitConfigs[i].eid];

                // Checkpoint the existing rate limit to not retroactively apply the new decay rate.
                _checkAndUpdateRateLimit(_rateLimitConfigs[i].eid, 0, _direction);

                // Does NOT reset the amountInFlight/lastUpdated of an existing rate limit.
                rateLimit.limit = _rateLimitConfigs[i].limit;
                rateLimit.window = _rateLimitConfigs[i].window;
            }
        }
        emit RateLimitsChanged(_rateLimitConfigs, _direction);
    }

    /**
     * @notice Resets the rate limits (sets amountInFlight to 0) for the given endpoint ids.
     * @dev This is useful when the rate limit accounting type is changed.
     * @param _eids The endpoint ids to reset the rate limits for.
     * @param _direction The direction of the rate limits to reset.
     */
    function _resetRateLimits(uint32[] memory _eids, RateLimitDirection _direction) internal virtual {
        for (uint32 i = 0; i < _eids.length; i++) {
            RateLimit storage rateLimit = _direction == RateLimitDirection.Outbound
                ? outboundRateLimits[_eids[i]]
                : inboundRateLimits[_eids[i]];

            rateLimit.amountInFlight = 0;
            rateLimit.lastUpdated = uint128(block.timestamp);
        }
        emit RateLimitsReset(_eids, _direction);
    }

     /**
     * @notice Sets the rate limit accounting type.
     * @dev You may want to call `_resetRateLimits` after changing the rate limit accounting type.
     * @param _rateLimitAccountingType The new rate limit accounting type.
     */
    function _setRateLimitAccountingType(RateLimitAccountingType _rateLimitAccountingType) internal {
        rateLimitAccountingType = _rateLimitAccountingType;
        emit RateLimitAccountingTypeSet(_rateLimitAccountingType);
    }

    /**
     * @dev Calculates the current amount in flight and the available capacity based on the rate limit configuration and time elapsed.
     * This function applies a linear decay model to compute how much of the 'amountInFlight' remains based on the time elapsed since the last update.
     * @param _amountInFlight The total amount that was in flight at the last update.
     * @param _lastUpdated The timestamp (in seconds) when the last update occurred.
     * @param _limit The maximum allowable amount within the specified window.
     * @param _window The time window (in seconds) for which the limit applies.
     * @return currentAmountInFlight The decayed amount of in-flight based on the elapsed time since lastUpdated. If the time since lastUpdated exceeds the window, it returns zero.
     * @return availableCapacity The amount of capacity available for new activity. If the time since lastUpdated exceeds the window, it returns the full limit.
     */
    function _calculateDecay(
        uint256 _amountInFlight,
        uint128 _lastUpdated,
        uint256 _limit,
        uint48 _window
    ) internal view returns (uint256 currentAmountInFlight, uint256 availableCapacity) {
        uint256 timeSinceLastUpdate = block.timestamp - _lastUpdated;
        if (timeSinceLastUpdate >= _window) {
            return (0, _limit);
        } else {
            uint256 decay = (_limit * timeSinceLastUpdate) / _window;
            currentAmountInFlight = _amountInFlight > decay ? _amountInFlight - decay : 0;
            availableCapacity = _limit > currentAmountInFlight ? _limit - currentAmountInFlight : 0;
            return (currentAmountInFlight, availableCapacity);
        }
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
        uint256 _amountInFlight,
        uint128 _lastUpdated,
        uint256 _limit,
        uint48 _window
    ) internal view virtual returns (uint256 currentAmountInFlight, uint256 amountCanBeSent) {
        (currentAmountInFlight, amountCanBeSent) = _calculateDecay(_amountInFlight, _lastUpdated, _limit, _window);
    }

    /**
     * @notice Checks current amount in flight and amount that can be sent for a given rate limit window.
     * @param _amountInFlight The amount in the current window.
     * @param _lastUpdated Timestamp representing the last time the rate limit was checked or updated.
     * @param _limit This represents the maximum allowed amount within a given window.
     * @param _window Defines the duration of the rate limiting window.
     * @return currentAmountInFlight The amount in the current window.
     * @return amountCanBeReceived The amount that can be received.
     */
    function _amountCanBeReceived(
        uint256 _amountInFlight,
        uint128 _lastUpdated,
        uint256 _limit,
        uint48 _window
    ) internal view virtual returns (uint256 currentAmountInFlight, uint256 amountCanBeReceived) {
        (currentAmountInFlight, amountCanBeReceived) = _calculateDecay(_amountInFlight, _lastUpdated, _limit, _window);
    }
    
    /**
     * @notice Checks and updates the rate limit based on the endpoint ID and amount.
     * @param _eid The endpoint ID for which the rate limit needs to be checked and updated.
     * @param _amount The amount to add to the current amount in flight.
     * @param _direction The direction (inbound or outbound) of the rate limits being checked.
     */
    function _checkAndUpdateRateLimit(uint32 _eid, uint256 _amount, RateLimitDirection _direction) internal {
        // Select the correct mapping based on the direction of the rate limit
        RateLimit storage rl = _direction == RateLimitDirection.Outbound
            ? outboundRateLimits[_eid]
            : inboundRateLimits[_eid];

        // Calculate current amount in flight and available capacity
        (uint256 currentAmountInFlight, uint256 availableCapacity) = _calculateDecay(
            rl.amountInFlight,
            rl.lastUpdated,
            rl.limit,
            rl.window
        );

        // Check if the requested amount exceeds the available capacity
        if (_amount > availableCapacity) revert RateLimitExceeded();

        // Update the rate limit with the new amount in flight and the current timestamp
        rl.amountInFlight = currentAmountInFlight + _amount;
        rl.lastUpdated = uint128(block.timestamp);

        if (rateLimitAccountingType == RateLimitAccountingType.Net) {
            RateLimit storage oppositeRL = _direction == RateLimitDirection.Outbound
                ? inboundRateLimits[_eid]
                : outboundRateLimits[_eid];
            (uint256 otherCurrentAmountInFlight,) = _calculateDecay(
                oppositeRL.amountInFlight,
                oppositeRL.lastUpdated,
                oppositeRL.limit,
                oppositeRL.window
            );
            unchecked {
                oppositeRL.amountInFlight = otherCurrentAmountInFlight > _amount ? otherCurrentAmountInFlight - _amount : 0;
            }
            oppositeRL.lastUpdated = uint128(block.timestamp);
        }
    }
}