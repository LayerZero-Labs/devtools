module uln_302::assert_valid_default_uln_config {
    use endpoint_v2_common::assert_no_duplicates;
    use msglib_types::configs_uln::{Self, get_optional_dvn_threshold, UlnConfig};

    friend uln_302::configuration;

    #[test_only]
    friend uln_302::assert_valid_default_uln_config_tests;

    const MAX_DVNS: u64 = 127;

    public(friend) fun assert_valid_default_uln_config(config: &UlnConfig) {
        let use_default_for_required_dvns = configs_uln::get_use_default_for_required_dvns(config);
        let use_default_for_optional_dvns = configs_uln::get_use_default_for_optional_dvns(config);
        let use_default_for_confirmations = configs_uln::get_use_default_for_confirmations(config);
        assert!(!use_default_for_required_dvns, EREQUESTING_USE_DEFAULT_REQUIRED_DVNS_FOR_DEFAULT_CONFIG);
        assert!(!use_default_for_optional_dvns, EREQUESTING_USE_DEFAULT_OPTIONAL_DVNS_FOR_DEFAULT_CONFIG);
        assert!(!use_default_for_confirmations, EREQUESTING_USE_DEFAULT_CONFIRMATIONS_FOR_DEFAULT_CONFIG);
        let required_dvn_count = configs_uln::get_required_dvn_count(config);
        let optional_dvn_count = configs_uln::get_optional_dvn_count(config);
        let optional_dvn_threshold = get_optional_dvn_threshold(config);
        assert!(required_dvn_count > 0 || optional_dvn_threshold > 0, ENO_EFFECTIVE_DVN_THRESHOLD);
        assert!((optional_dvn_threshold as u64) <= optional_dvn_count, EOPTIONAL_DVN_THRESHOLD_EXCEEDS_COUNT);
        assert!(required_dvn_count <= MAX_DVNS, ETOO_MANY_REQUIRED_DVNS);
        assert!(optional_dvn_count <= MAX_DVNS, ETOO_MANY_OPTIONAL_DVNS);
        assert_no_duplicates::assert_no_duplicates(&configs_uln::get_required_dvns(config));
        assert_no_duplicates::assert_no_duplicates(&configs_uln::get_optional_dvns(config));
    }

    // ================================================== Error Codes =================================================

    const ENO_EFFECTIVE_DVN_THRESHOLD: u64 = 1;
    const EOPTIONAL_DVN_THRESHOLD_EXCEEDS_COUNT: u64 = 2;
    const EREQUESTING_USE_DEFAULT_CONFIRMATIONS_FOR_DEFAULT_CONFIG: u64 = 3;
    const EREQUESTING_USE_DEFAULT_OPTIONAL_DVNS_FOR_DEFAULT_CONFIG: u64 = 4;
    const EREQUESTING_USE_DEFAULT_REQUIRED_DVNS_FOR_DEFAULT_CONFIG: u64 = 5;
    const ETOO_MANY_OPTIONAL_DVNS: u64 = 6;
    const ETOO_MANY_REQUIRED_DVNS: u64 = 7;
}
