// **Important** These tests are only valid for the default configuration of OFT Native Coin. If the configuration is
// changed, these tests will need to be updated to reflect those changes
#[test_only]
module oft::oft_coin_tests {
    use std::account::{create_account_for_test, create_signer_for_test};
    use std::coin;
    use std::fungible_asset::Metadata;
    use std::object::address_to_object;
    use std::option;
    use std::primary_fungible_store;
    use std::timestamp;
    use std::vector;

    use endpoint_v2::test_helpers::setup_layerzero_for_test;
    use endpoint_v2_common::bytes32;
    use endpoint_v2_common::native_token_test_helpers::mint_native_token_for_test;
    use oft::oapp_core;
    use oft::oft::remove_dust;
    use oft::oft_coin::{Self, burn_token_for_test, mint_tokens_for_test, PlaceholderCoin};
    use oft::oft_impl_config;
    use oft::oft_store;
    use oft_common::oft_limit::new_unbounded_oft_limit;

    const MAXU64: u64 = 0xffffffffffffffff;
    const LOCAL_EID: u32 = 101;

    fun setup() {
        setup_layerzero_for_test(@simple_msglib, LOCAL_EID, LOCAL_EID);

        oft::oapp_test_helper::init_oapp();

        oft_store::init_module_for_test();
        oft_coin::init_module_for_test();
        oft_impl_config::init_module_for_test();
    }

    #[test]
    fun test_debit() {
        setup();

        let dst_eid = 2u32;
        // This configuration function (debit) is not resposible for handling dust, therefore the tested amount excludes
        // the dust amount (last two digits)
        let amount_ld = 123456700;
        let min_amount_ld = 0u64;

        let coin = mint_tokens_for_test<PlaceholderCoin>(amount_ld);

        let dust_removed = remove_dust(amount_ld);
        let (sent, received) = oft_coin::debit_coin(
            @444,
            &mut coin,
            min_amount_ld,
            dst_eid,
        );

        // amount sent and received should reflect the amount debited
        assert!(sent == dust_removed, 0);
        assert!(received == dust_removed, 0);

        // no remaining balance
        let remaining_balance = coin::value(&coin);
        assert!(remaining_balance == amount_ld - dust_removed, 0);

        burn_token_for_test(coin);
    }

    #[test]
    fun test_credit() {
        setup();

        let amount_ld = 123456700;
        let lz_receive_value = option::none();
        let src_eid = 12345;

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 0, 0);

        let credited = oft_coin::credit(
            to,
            amount_ld,
            src_eid,
            lz_receive_value,
        );
        // amount credited should reflect the amount credited
        assert!(credited == 123456700, 0);

        // balance should appear in account
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 123456700, 0);
    }

    #[test]
    fun test_credit_with_extra_lz_receive_drop() {
        setup();

        let amount_ld = 0;
        let lz_receive_value = option::some(mint_native_token_for_test(100));
        let src_eid = 12345;

        let to = @555;
        let to_signer = &create_account_for_test(to);
        coin::register<PlaceholderCoin>(to_signer);

        // 0 balance before crediting
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 0, 0);

        oft_coin::credit(
            to,
            amount_ld,
            src_eid,
            lz_receive_value,
        );
        let native_token_metadata = address_to_object<Metadata>(@native_token_metadata_address);
        assert!(primary_fungible_store::balance(@oft, native_token_metadata) == 100, 1)
    }

    #[test]
    fun test_debit_view() {
        setup();

        // shouldn't take a fee
        let (sent, received) = oft_coin::debit_view(123456700, 100, 2);
        let dust_removed = remove_dust(123456700);
        assert!(sent == dust_removed, 0);
        assert!(received == dust_removed, 0);
    }

    #[test]
    #[expected_failure(abort_code = oft::oft_core::ESLIPPAGE_EXCEEDED)]
    fun test_debit_view_fails_if_less_than_min() {
        setup();

        oft_coin::debit_view(32, 100, 2);
    }

    #[test]
    fun test_build_options() {
        setup();
        let dst_eid = 103;

        let message_type = 2;

        let options = oft_coin::build_options(
            message_type,
            dst_eid,
            // OKAY that it's not type 3 if no enforced options are set
            x"1234",
            @123,
            123324,
            bytes32::from_address(@444),
            x"8888",
            x"34"
        );
        // should pass through the options if none configured
        assert!(options == x"1234", 0);

        let oft_admin = &create_signer_for_test(@oft_admin);
        oapp_core::set_enforced_options(
            oft_admin,
            dst_eid,
            message_type,
            x"00037777"
        );

        let options = oft_coin::build_options(
            message_type,
            dst_eid,
            x"00031234",
            @123,
            123324,
            bytes32::from_address(@444),
            x"8888",
            x"34"
        );

        // should append to configured options
        assert!(options == x"000377771234", 0);
    }

    #[test]
    fun test_inspect_message() {
        // doesn't do anything, just tests that it doesn't fail
        oft_coin::inspect_message(
            &x"1234",
            &x"1234",
            true,
        );
    }

    #[test]
    fun test_oft_limit_and_fees() {
        setup();

        timestamp::set_time_has_started_for_testing(&create_signer_for_test(@std));
        let (limit, fees) = oft_coin::oft_limit_and_fees(
            123,
            x"1234",
            123,
            100,
            x"1234",
            x"1234",
            x"1234"
        );

        // always unbounded and empty for this oft configuration
        assert!(limit == new_unbounded_oft_limit(), 0);
        assert!(vector::length(&fees) == 0, 0);
    }
}
