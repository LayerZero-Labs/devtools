/// Timestamp module exists to provide compatibility with aptos.
module initia_std::timestamp {
    use initia_std::block::get_block_info;

    /// Conversion factor between seconds and microseconds
    const MICRO_CONVERSION_FACTOR: u64 = 1000000;

    #[view]
    /// Gets the current time in microseconds.
    public fun now_microseconds(): u64 {
        let timestamp = now_seconds();
        timestamp * MICRO_CONVERSION_FACTOR
    }

    #[view]
    /// Gets the current time in seconds.
    public fun now_seconds(): u64 {
        let (_, timestamp) = get_block_info();
        timestamp
    }

    #[test_only]
    public fun set_time_has_started_for_testing(_: &signer) {
        // no-op
    }

    /// The blockchain is not in an operating state yet
    const ENOT_OPERATING: u64 = 1;
    /// An invalid timestamp was provided
    const EINVALID_TIMESTAMP: u64 = 2;

    #[test_only]
    use initia_std::block::set_block_info;

    #[test_only]
    use std::error;

    #[test_only]
    public fun update_global_time_for_test(timestamp_microsecs: u64) {
        update_global_time_for_test_secs(timestamp_microsecs / MICRO_CONVERSION_FACTOR);
    }

    #[test_only]
    public fun update_global_time_for_test_secs(timestamp_seconds: u64) {
        let (height, now) = get_block_info();
        assert!(now < timestamp_seconds, error::invalid_argument(EINVALID_TIMESTAMP));
        set_block_info(height, timestamp_seconds);
    }
}
