// **Important** These tests are only valid for the default configuration of OFT Adapter FA. If the configuration is
// changed, these tests will need to be updated to reflect those changes
#[test_only]
module oft::oft_adapter_fa_tests {
    use std::account::{create_account_for_test, create_signer_for_test};
    use std::fungible_asset::{Self, Metadata};
    use std::object::address_to_object;
    use std::option;
    use std::primary_fungible_store;
    use std::vector;

    use endpoint_v2::test_helpers::setup_layerzero_for_test;
    use endpoint_v2_common::bytes32;
    use endpoint_v2_common::native_token_test_helpers::{burn_token_for_test, initialize_native_token_for_test,
        mint_native_token_for_test
    };
    use oft::oapp_core;
    use oft::oapp_store::OAPP_ADDRESS;
    use oft::oft_adapter_fa::{Self, escrow_address};
    use oft_common::oft_limit::new_unbounded_oft_limit;

    const MAXU64: u64 = 0xffffffffffffffff;
    const LOCAL_EID: u32 = 101;

    fun setup() {
        initialize_native_token_for_test();
        setup_layerzero_for_test(@simple_msglib, LOCAL_EID, LOCAL_EID);
        let oft_account = &create_signer_for_test(OAPP_ADDRESS());
        oft_adapter_fa::initialize(oft_account, @native_token_metadata_address, 8);
        oft::oapp_test_helper::init_oapp();
    }

    #[test]
    fun test_debit() {
        setup();

        let dst_eid = 2u32;
        // This configuration function (debit) is not resposible for handling dust, therefore the tested amount excludes
        // the dust amount (last two digits)
        let amount_ld = 123456700;
        let min_amount_ld = 0u64;

        let fa = mint_native_token_for_test(amount_ld);
        let (sent, received) = oft_adapter_fa::debit_fungible_asset(
            &mut fa,
            min_amount_ld,
            dst_eid,
        );

        // amount sent and received should reflect the amount debited
        assert!(sent == 123456700, 0);
        assert!(received == 123456700, 0);

        // no remaining balance in debited account
        let remaining_balance = fungible_asset::amount(&fa);
        assert!(remaining_balance == 00, 0);
        burn_token_for_test(fa);

        // escrow balance should increase to match
        let balance = primary_fungible_store::balance(escrow_address(), oft_adapter_fa::metadata());
        assert!(balance == 123456700, 0);
    }

    #[test]
    fun test_credit() {
        setup();

        let amount_ld = 123456700;
        let lz_receive_value = option::none();
        let src_eid = 12345;

        // debit first to make sure account has balance

        let deposit = mint_native_token_for_test(amount_ld);
        oft_adapter_fa::debit_fungible_asset(
            &mut deposit,
            0,
            src_eid,
        );
        burn_token_for_test(deposit);

        let balance = primary_fungible_store::balance(escrow_address(), oft_adapter_fa::metadata());
        assert!(balance == amount_ld, 0);

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = primary_fungible_store::balance(to, oft_adapter_fa::metadata());
        assert!(balance == 0, 0);

        let credited = oft_adapter_fa::credit(
            to,
            amount_ld,
            src_eid,
            lz_receive_value,
        );
        // amount credited should reflect the amount credited
        assert!(credited == 123456700, 0);

        // balance should appear in recipient account
        let balance = primary_fungible_store::balance(to, oft_adapter_fa::metadata());
        assert!(balance == 123456700, 0);

        // escrow balance should be back to 0
        let balance = primary_fungible_store::balance(escrow_address(), oft_adapter_fa::metadata());
        assert!(balance == 0, 0);
    }

    #[test]
    #[expected_failure(abort_code = 0x10004, location = std::fungible_asset)]
    fun test_credit_fails_if_insufficient_balance() {
        setup();

        let amount_ld = 123456700;
        let lz_receive_value = option::none();
        let src_eid = 12345;

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = primary_fungible_store::balance(to, oft_adapter_fa::metadata());
        assert!(balance == 0, 0);

        let credited = oft_adapter_fa::credit(
            to,
            amount_ld,
            src_eid,
            lz_receive_value,
        );
        // amount credited should reflect the amount credited
        assert!(credited == 123456700, 0);

        // balance should appear in account
        let balance = primary_fungible_store::balance(to, oft_adapter_fa::metadata());
        assert!(balance == 123456700, 0);
    }

    #[test]
    fun test_credit_with_extra_lz_receive_drop() {
        setup();

        let amount_ld = 0;
        let lz_receive_value = option::some(mint_native_token_for_test(100));
        let src_eid = 12345;

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = primary_fungible_store::balance(to, oft_adapter_fa::metadata());
        assert!(balance == 0, 0);

        oft_adapter_fa::credit(
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
        let (sent, received) = oft_adapter_fa::debit_view(123456700, 100, 2);
        assert!(sent == 123456700, 0);
        assert!(received == 123456700, 0);
    }

    #[test]
    #[expected_failure(abort_code = oft::oft_core::ESLIPPAGE_EXCEEDED)]
    fun test_debit_view_fails_if_less_than_min() {
        setup();

        oft_adapter_fa::debit_view(32, 100, 2);
    }

    #[test]
    fun test_build_options() {
        setup();
        let dst_eid = 103;

        let message_type = 2;

        let options = oft_adapter_fa::build_options(
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

        let oft_account = &create_signer_for_test(OAPP_ADDRESS());
        oapp_core::set_enforced_options(
            oft_account,
            dst_eid,
            message_type,
            x"00037777"
        );

        let options = oft_adapter_fa::build_options(
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
        initialize_native_token_for_test();
        // doesn't do anything, just tests that it doesn't fail
        oft_adapter_fa::inspect_message(
            &x"1234",
            &x"1234",
            true,
        );
    }

    #[test]
    fun test_oft_limit_and_fees() {
        initialize_native_token_for_test();
        let (limit, fees) = oft_adapter_fa::oft_limit_and_fees(
            123,
            x"1234",
            123,
            123,
            x"1234",
            x"1234",
            x"1234"
        );

        // always unbounded and empty for this oft configuration
        assert!(limit == new_unbounded_oft_limit(), 0);
        assert!(vector::length(&fees) == 0, 0);
    }
}
