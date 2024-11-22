// **Important** These tests are only valid for the default configuration of OFT Adapter Coin. If the configuration is
// changed, these tests will need to be updated to reflect those changes
#[test_only]
module oft::oft_adapter_coin_tests {
    use std::account::{create_account_for_test, create_signer_for_test};
    use std::coin::{Self, BurnCapability, MintCapability};
    use std::fungible_asset::Metadata;
    use std::object::address_to_object;
    use std::option;
    use std::primary_fungible_store;
    use std::string::utf8;
    use std::vector;

    use endpoint_v2::test_helpers::setup_layerzero_for_test;
    use endpoint_v2_common::bytes32;
    use endpoint_v2_common::native_token_test_helpers::mint_native_token_for_test;
    use oft::oapp_core;
    use oft::oapp_store::OAPP_ADDRESS;
    use oft::oft_adapter_coin::{Self, escrow_address, PlaceholderCoin};
    use oft_common::oft_limit::new_unbounded_oft_limit;

    const MAXU64: u64 = 0xffffffffffffffff;
    const LOCAL_EID: u32 = 101;

    fun setup(): (MintCapability<PlaceholderCoin>, BurnCapability<PlaceholderCoin>) {
        // Create the Coin
        let coin_account = &create_account_for_test(OAPP_ADDRESS());
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<PlaceholderCoin>(
            coin_account,
            utf8(b"Test Token"),
            utf8(b"TT"),
            8,
            false,
        );
        coin::destroy_freeze_cap(freeze_cap);

        // Initialize
        setup_layerzero_for_test(@simple_msglib, LOCAL_EID, LOCAL_EID);
        let oft_account = &create_signer_for_test(OAPP_ADDRESS());
        oft::oapp_test_helper::init_oapp();
        oft_adapter_coin::initialize(
            oft_account,
            6,
        );

        (mint_cap, burn_cap)
    }

    #[test]
    fun test_debit() {
        let (mint_cap, burn_cap) = setup();
        let dst_eid = 2u32;
        // This configuration function (debit) is not resposible for handling dust, therefore the tested amount excludes
        // the dust amount (last two digits)
        let amount_ld = 123456700;
        let min_amount_ld = 0u64;

        let coin = coin::mint<PlaceholderCoin>(amount_ld, &mint_cap);
        let (sent, received) = oft_adapter_coin::debit_coin(
            &mut coin,
            min_amount_ld,
            dst_eid,
        );

        // amount sent and received should reflect the amount debited
        assert!(sent == 123456700, 0);
        assert!(received == 123456700, 0);

        // no remaining balance in debited account
        let remaining_balance = coin::value(&coin);
        assert!(remaining_balance == 00, 0);
        coin::burn(coin, &burn_cap);

        // escrow balance should increase to match
        let balance = coin::balance<PlaceholderCoin>(escrow_address());
        assert!(balance == 123456700, 0);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    fun test_credit() {
        let (mint_cap, burn_cap) = setup();

        let amount_ld = 123456700;
        let lz_receive_value = option::none();
        let src_eid = 12345;

        // debit first to make sure account has balance

        let deposit = coin::mint(amount_ld, &mint_cap);
        oft_adapter_coin::debit_coin(
            &mut deposit,
            0,
            src_eid,
        );
        coin::burn(deposit, &burn_cap);

        let balance = coin::balance<PlaceholderCoin>(escrow_address());
        assert!(balance == amount_ld, 0);

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 0, 0);

        let credited = oft_adapter_coin::credit(
            to,
            amount_ld,
            src_eid,
            lz_receive_value,
        );
        // amount credited should reflect the amount credited
        assert!(credited == 123456700, 0);

        // balance should appear in recipient account
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 123456700, 0);

        // escrow balance should be back to 0
        let balance = coin::balance<PlaceholderCoin>(escrow_address());
        assert!(balance == 0, 0);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    #[expected_failure(abort_code = 0x10006, location = std::coin)]
    fun test_credit_fails_if_insufficient_balance() {
        let (mint_cap, burn_cap) = setup();

        let amount_ld = 123456700;
        let lz_receive_value = option::none();
        let src_eid = 12345;

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 0, 0);

        // register to Coin store
        coin::register<PlaceholderCoin>(&create_signer_for_test(to));

        let credited = oft_adapter_coin::credit(
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

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    fun test_credit_with_extra_lz_receive_drop() {
        let (mint_cap, burn_cap) = setup();

        let amount_ld = 123456700;
        let lz_receive_value = option::some(mint_native_token_for_test(100));
        let src_eid = 12345;

        let to = @555;
        create_account_for_test(to);

        // 0 balance before crediting
        let balance = coin::balance<PlaceholderCoin>(to);
        assert!(balance == 0, 0);

        let initial_deposit = coin::mint(amount_ld, &mint_cap);
        oft_adapter_coin::debit_coin(&mut initial_deposit, amount_ld, src_eid);
        coin::burn(initial_deposit, &burn_cap);

        oft_adapter_coin::credit(
            to,
            amount_ld,
            src_eid,
            lz_receive_value,
        );

        let native_token_metadata = address_to_object<Metadata>(@native_token_metadata_address);
        assert!(primary_fungible_store::balance(@oft, native_token_metadata) == 100, 1);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    fun test_debit_view() {
        let (mint_cap, burn_cap) = setup();

        // shouldn't take a fee
        let (sent, received) = oft_adapter_coin::debit_view(123456700, 100, 2);
        assert!(sent == 123456700, 0);
        assert!(received == 123456700, 0);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    #[expected_failure(abort_code = oft::oft_core::ESLIPPAGE_EXCEEDED)]
    fun test_debit_view_fails_if_less_than_min() {
        let (mint_cap, burn_cap) = setup();

        oft_adapter_coin::debit_view(32, 100, 2);

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    fun test_build_options() {
        let (mint_cap, burn_cap) = setup();

        let dst_eid = 103;
        let message_type = 2;

        let options = oft_adapter_coin::build_options(
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

        let options = oft_adapter_coin::build_options(
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

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    fun test_inspect_message() {
        let (mint_cap, burn_cap) = setup();
        // doesn't do anything, just tests that it doesn't fail
        oft_adapter_coin::inspect_message(
            &x"1234",
            &x"1234",
            true,
        );

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test]
    fun test_oft_limit_and_fees() {
        let (mint_cap, burn_cap) = setup();
        let (limit, fees) = oft_adapter_coin::oft_limit_and_fees(
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

        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }
}
