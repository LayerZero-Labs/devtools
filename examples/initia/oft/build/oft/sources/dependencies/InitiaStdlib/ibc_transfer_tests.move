#[test_only]
module cafe::ibc_transfer_tests {
    use std::account::create_signer_for_test;
    use std::unit_test::create_signers_for_testing;
    use std::vector;
    use std::managed_coin;
    use std::coin;
    use std::string::{Self, String, utf8};
    use std::option;
    use std::signer;
    use std::cosmos;
    use std::address;
    use std::block;
    use std::ibctesting;
    use std::json;
    use std::object::Object;
    use std::fungible_asset::Metadata;
    use std::function_info::new_function_info_for_testing;
    use cafe::ibc_transfer_tests_helpers::{
        store_on_callback_request,
        check_on_callback_response,
        store_on_receive_request,
        check_on_receive_response,
        store_on_timeout_request,
        check_on_timeout_response,
        store_on_ack_request,
        check_on_ack_response
    };

    #[test]
    fun test_ibc_transfer_success() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000u64 },
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(
                b"{\"move\": {\"message\": {\"module_address\":\"0xcafe\", \"module_name\":\"test\", \"function_name\":\"test\", \"type_args\":[\"test1\",\"test2\"], \"args\": [\"test1\", \"test2\"]}}}"
            )
        };

        // with callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::allow_failure_with_callback(
                100u64, utf8(b"0xcafe::ibc_transfer_tests_helpers::on_callback")
            )
        );

        // store requests
        store_on_callback_request(
            *vector::borrow(&addrs, 0),
            1_000u64,
            true,
            100u64
        );

        let type_args = vector::empty();
        vector::push_back(&mut type_args, utf8(b"test1"));
        vector::push_back(&mut type_args, utf8(b"test2"));
        let args = vector::empty();
        vector::push_back(&mut args, utf8(b"test1"));
        vector::push_back(&mut args, utf8(b"test2"));
        let expected_msg =
            ibctesting::new_move_message(
                @cafe,
                utf8(b"test"),
                utf8(b"test"),
                type_args,
                args
            );
        store_on_receive_request(&option::some(expected_msg), true);

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();

        // called
        check_on_callback_response(true);

        // chain operations (relay packets)
        ibctesting::relay_packets(
            &new_function_info_for_testing(
                @cafe, utf8(b"ibc_transfer_tests_helpers"), utf8(b"on_receive")
            )
        );

        // receive should be called
        check_on_receive_response(true);
    }

    #[test]
    fun test_ibc_transfer_fail_with_allow_failure() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000_001u64 }, // put more than balance
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(b"")
        };

        // with callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::allow_failure_with_callback(
                101u64, utf8(b"0xcafe::ibc_transfer_tests_helpers::on_callback")
            )
        );

        // store requests
        store_on_callback_request(*vector::borrow(&addrs, 0), 0u64, false, 101u64);

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();

        // called with failure
        check_on_callback_response(true);

        // chain operations (relay packets)
        ibctesting::relay_packets(
            &new_function_info_for_testing(
                @cafe, utf8(b"ibc_transfer_tests_helpers"), utf8(b"on_receive")
            )
        );

        // on_receive not called
        check_on_receive_response(false);
    }

    #[test]
    fun test_ibc_transfer_success_without_callback() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000u64 },
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(b"")
        };

        // without callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::disallow_failure()
        );

        // store requests
        // store_on_callback_request(*vector::borrow(&addrs, 0), 1_000u64, true);
        store_on_receive_request(&option::none(), true);

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();

        // not called
        check_on_callback_response(false);

        // chain operations (relay packets)
        ibctesting::relay_packets(
            &new_function_info_for_testing(
                @cafe, utf8(b"ibc_transfer_tests_helpers"), utf8(b"on_receive")
            )
        );

        // receive should be called
        check_on_receive_response(true);
    }

    #[test]
    #[expected_failure(abort_code = 0x3, location = 0x1::ibctesting)]
    fun test_ibc_transfer_failure() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000_001u64 }, // put more than balance
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(b"")
        };

        // without callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::disallow_failure()
        );

        // store requests
        // store_on_callback_request(*vector::borrow(&addrs, 0), 1_000u64, true);
        store_on_receive_request(&option::none(), true);

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();
    }

    #[test]
    fun test_ibc_transfer_timeout() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000u64 },
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(
                b"{\"move\":{\"async_callback\":{\"id\": \"103\", \"module_address\": \"0xcafe\", \"module_name\": \"ibc_transfer_tests_helpers\"}}}"
            )
        };

        // with callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::allow_failure_with_callback(
                100u64, utf8(b"0xcafe::ibc_transfer_tests_helpers::on_callback")
            )
        );

        // store requests
        store_on_callback_request(
            *vector::borrow(&addrs, 0),
            1_000u64,
            true,
            100u64
        );
        store_on_receive_request(&option::none(), true);
        store_on_timeout_request(103u64, *vector::borrow(&addrs, 0));

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();

        // callback should be called
        check_on_callback_response(true);

        // set block info to raise timeout
        block::set_block_info(20u64, 0u64);

        // chain operations (relay packets)
        ibctesting::relay_packets(
            &new_function_info_for_testing(
                @cafe, utf8(b"ibc_transfer_tests_helpers"), utf8(b"on_receive")
            )
        );

        // receive should not be called
        check_on_receive_response(false);

        // relay acks and timeouts
        ibctesting::relay_acks_timeouts();

        // timeout should be called
        check_on_timeout_response(true);

        // ack should not be called
        check_on_ack_response(false);
    }

    #[test]
    fun test_ibc_transfer_ack_success() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000u64 },
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(
                b"{\"move\":{\"async_callback\":{\"id\": \"103\", \"module_address\": \"0xcafe\", \"module_name\": \"ibc_transfer_tests_helpers\"}}}"
            )
        };

        // with callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::allow_failure_with_callback(
                100u64, utf8(b"0xcafe::ibc_transfer_tests_helpers::on_callback")
            )
        );

        // store requests
        store_on_callback_request(
            *vector::borrow(&addrs, 0),
            1_000u64,
            true,
            100u64
        );
        store_on_receive_request(&option::none(), true);
        store_on_ack_request(
            103u64,
            true,
            *vector::borrow(&addrs, 0),
            1_000u64
        );

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();

        // callback should be called
        check_on_callback_response(true);

        // chain operations (relay packets)
        ibctesting::relay_packets(
            &new_function_info_for_testing(
                @cafe, utf8(b"ibc_transfer_tests_helpers"), utf8(b"on_receive")
            )
        );

        // receive should be called
        check_on_receive_response(true);

        // relay acks and timeouts
        ibctesting::relay_acks_timeouts();

        // timeout should be called
        check_on_timeout_response(false);

        // ack should not be called
        check_on_ack_response(true);
    }

    #[test]
    fun test_ibc_transfer_ack_failure() {
        create_init_token();

        // initialize block info
        block::set_block_info(1u64, 0u64);

        let signers = create_signers_for_testing(2);
        let addrs = vector::map_ref(&signers, |s| signer::address_of(s));
        fund_init_token(*vector::borrow(&addrs, 0), 1_000_000u64);

        // without callback
        let request = TransferRequest {
            _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
            source_port: string::utf8(b"transfer"),
            source_channel: string::utf8(b"channel-0"),
            sender: address::to_sdk(*vector::borrow(&addrs, 0)),
            receiver: address::to_sdk(*vector::borrow(&addrs, 1)),
            token: CosmosCoin { denom: string::utf8(b"uinit"), amount: 1_000u64 },
            timeout_height: TimeoutHeight {
                revision_number: 0u64, // unused in this test
                revision_height: 10u64 // set timeout height to 10
            },
            timeout_timestamp: 0u64, // timeout timestamp is not used in this test
            memo: string::utf8(
                b"{\"move\":{\"async_callback\":{\"id\": \"103\", \"module_address\": \"0xcafe\", \"module_name\": \"ibc_transfer_tests_helpers\"}}}"
            )
        };

        // with callback
        cosmos::stargate_with_options(
            vector::borrow(&signers, 0),
            json::marshal(&request),
            cosmos::allow_failure_with_callback(
                100u64, utf8(b"0xcafe::ibc_transfer_tests_helpers::on_callback")
            )
        );

        // store requests
        store_on_callback_request(
            *vector::borrow(&addrs, 0),
            1_000u64,
            true,
            100u64
        );
        store_on_receive_request(&option::none(), false); // trigger fail on receive
        store_on_ack_request(
            103u64,
            false,
            *vector::borrow(&addrs, 0),
            1_000u64
        ); // expect ack to receive failure

        // chain operations (execute cosmos messages)
        ibctesting::execute_cosmos_messages();

        // callback should be called
        check_on_callback_response(true);

        // chain operations (relay packets)
        ibctesting::relay_packets(
            &new_function_info_for_testing(
                @cafe, utf8(b"ibc_transfer_tests_helpers"), utf8(b"on_receive")
            )
        );

        // receive should be called
        check_on_receive_response(true);

        // relay acks and timeouts
        ibctesting::relay_acks_timeouts();

        // timeout should be called
        check_on_timeout_response(false);

        // ack should not be called
        check_on_ack_response(true);
    }

    //
    // Helpers
    //

    fun init_metadata(): Object<Metadata> {
        coin::metadata(@std, string::utf8(b"uinit"))
    }

    fun create_init_token() {
        let chain_signer = create_signer_for_test(@std);
        managed_coin::initialize(
            &chain_signer,
            option::none(),
            string::utf8(b"INIT"),
            string::utf8(b"uinit"),
            0u8,
            string::utf8(b""),
            string::utf8(b"")
        );
    }

    fun fund_init_token(recipient: address, amount: u64) {
        let chain_signer = create_signer_for_test(@std);
        let metadata = init_metadata();
        managed_coin::mint_to(&chain_signer, recipient, metadata, amount);
    }

    //
    // Types
    //

    struct TransferRequest has copy, drop {
        _type_: String,
        source_port: String,
        source_channel: String,
        sender: String,
        receiver: String,
        token: CosmosCoin,
        timeout_height: TimeoutHeight,
        timeout_timestamp: u64,
        memo: String
    }

    struct CosmosCoin has copy, drop {
        denom: String,
        amount: u64
    }

    struct TimeoutHeight has copy, drop {
        revision_number: u64,
        revision_height: u64
    }
}
