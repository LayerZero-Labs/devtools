// **Important** This module tests the behavior of OFT assuming that it is connected to OFT_FA. When connecting to
// a different template such as OFT_ADAPTER_FA or configuring the OFT module differently, the tests will no longer be
// valid.
#[test_only]
module oft::oft_using_oft_fa_tests {
    use std::account::create_signer_for_test;
    use std::fungible_asset;
    use std::option;
    use std::primary_fungible_store::{Self, balance};
    use std::signer::address_of;
    use std::vector;

    use endpoint_v2::test_helpers::setup_layerzero_for_test;
    use endpoint_v2_common::bytes32::{from_address, from_bytes32};
    use endpoint_v2_common::contract_identity::make_dynamic_call_ref_for_test;
    use endpoint_v2_common::native_token_test_helpers::{burn_token_for_test, mint_native_token_for_test};
    use oft::oapp_core::set_peer;
    use oft::oapp_store::OAPP_ADDRESS;
    use oft::oft::{
        Self, debit_view, quote_oft, quote_send,
        remove_dust, send, send_withdraw, to_ld, to_sd, token};
    use oft::oft_fa::mint_tokens_for_test;
    use oft_common::oft_limit::{max_amount_ld, min_amount_ld};

    const MAXU64: u64 = 0xffffffffffffffff;
    const SRC_EID: u32 = 101;
    const DST_EID: u32 = 201;

    fun setup(local_eid: u32, remote_eid: u32) {
        let oft_signer = &create_signer_for_test(OAPP_ADDRESS());
        setup_layerzero_for_test(@simple_msglib, local_eid, remote_eid);
        oft::oapp_test_helper::init_oapp();
        oft::oft_fa::initialize(
            oft_signer,
            b"My Test Token",
            b"MYT",
            b"",
            b"",
            6,
            8,
        );

        let remote_oapp = from_address(@2000);
        set_peer(oft_signer, DST_EID, from_bytes32(remote_oapp));
    }

    #[test]
    fun test_quote_oft() {
        setup(SRC_EID, DST_EID);

        let receipient = from_address(@2000);
        let amount_ld = 100u64 * 100_000_000;  // 100 TOKEN
        let compose_msg = vector[];
        let (limit, fees, amount_sent_ld, amount_received_ld) = quote_oft(
            DST_EID,
            from_bytes32(receipient),
            amount_ld,
            0,
            vector[],
            compose_msg,
            vector[]
        );
        assert!(min_amount_ld(&limit) == 0, 0);
        assert!(max_amount_ld(&limit) == MAXU64, 1);
        assert!(vector::length(&fees) == 0, 2);

        assert!(amount_sent_ld == amount_ld, 3);
        assert!(amount_received_ld == amount_ld, 3);
    }

    #[test]
    fun test_quote_send() {
        setup(SRC_EID, DST_EID);

        let amount = 100u64 * 100_000_000;  // 100 TOKEN
        let (native_fee, zro_fee) = quote_send(
            @1000,
            DST_EID,
            from_bytes32(from_address(@2000)),
            amount,
            amount,
            vector[],
            vector[],
            vector[],
            false,
        );
        assert!(native_fee == 0, 0);
        assert!(zro_fee == 0, 1);
    }

    #[test]
    fun test_send_fa() {
        setup(SRC_EID, DST_EID);

        let amount = 100u64 * 100_000_000;  // 100 TOKEN
        let alice = &create_signer_for_test(@1234);
        let fa = mint_native_token_for_test(100_000_000);  // mint 1 APT to alice
        primary_fungible_store::deposit(address_of(alice), fa);
        let bob = from_address(@5678);
        let tokens = mint_tokens_for_test(amount);

        let native_fee = mint_native_token_for_test(10000000);
        let zro_fee = option::none();
        send(
            &make_dynamic_call_ref_for_test(address_of(alice), OAPP_ADDRESS(), b"send"),
            DST_EID,
            bob,
            &mut tokens,
            amount,
            vector[],
            vector[],
            vector[],
            &mut native_fee,
            &mut zro_fee,
        );
        assert!(fungible_asset::amount(&tokens) == 0, 1); // after send balance

        burn_token_for_test(native_fee);
        option::destroy_none(zro_fee);
        burn_token_for_test(tokens);
    }

    #[test]
    fun test_send() {
        setup(SRC_EID, DST_EID);

        let amount = 100u64 * 100_000_000;  // 100 TOKEN
        let alice = &create_signer_for_test(@1234);
        let fa = mint_native_token_for_test(100_000_000);  // mint 1 APT to alice
        primary_fungible_store::deposit(address_of(alice), fa);
        let bob = from_bytes32(from_address(@5678));
        let tokens = mint_tokens_for_test(amount);
        primary_fungible_store::deposit(address_of(alice), tokens);
        assert!(balance(address_of(alice), oft::metadata()) == amount, 0); // before send balance

        send_withdraw(alice, DST_EID, bob, amount, amount, vector[], vector[], vector[], 0, 0);
        assert!(balance(address_of(alice), oft::metadata()) == 0, 1); // after send balance
    }

    #[test]
    fun test_metadata_view_functions() {
        setup(SRC_EID, DST_EID);

        // token is unknown at time of test - just calling to check it doesn't abort
        token();

        assert!(to_ld(100) == 10000, 0);
        assert!(to_sd(100) == 1, 1);
        assert!(remove_dust(123) == 100, 2);

        let (sent, received) = debit_view(1234, 0, DST_EID);
        assert!(sent == 1200, 3);
        assert!(received == 1200, 4);
    }
}