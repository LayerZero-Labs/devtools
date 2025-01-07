#[test_only]
module cafe::ibc_transfer_tests_helpers {
    use std::signer;
    use std::option::{Self, Option};
    use std::coin;
    use std::ibctesting;
    use std::ibctesting_utils;
    use std::string::utf8;
    use std::fungible_asset::Metadata;
    use std::object::Object;
    use std::account::create_signer_for_test;

    struct OnCallbackRequest has key {
        sender: address,
        amount: u64,
        result: bool,
        id: u64
    }

    struct OnCallbackResponse has key {}

    struct OnReceiveRequest has key {
        msg_opt: Option<ibctesting::MoveMessage>,
        result: bool
    }

    struct OnReceiveResponse has key {}

    struct OnAckRequest has key {
        id: u64,
        result: bool,
        amount: u64,
        sender: address
    }

    struct OnAckResponse has key {}

    struct OnTimeoutRequest has key {
        id: u64,
        sender: address
    }

    struct OnTimeoutResponse has key {}

    public fun store_on_callback_request(
        sender: address, amount: u64, expected_result: bool, id: u64
    ) {
        let chain_signer = create_signer_for_test(@std);
        move_to<OnCallbackRequest>(
            &chain_signer,
            OnCallbackRequest { sender, amount, result: expected_result, id }
        );
    }

    public fun check_on_callback_response(called: bool) {
        assert!(called == exists<OnCallbackResponse>(@std), 0);
    }

    public fun store_on_receive_request(
        msg_opt: &Option<ibctesting::MoveMessage>, on_receive_result: bool
    ) {
        let chain_signer = create_signer_for_test(@std);
        move_to<OnReceiveRequest>(
            &chain_signer,
            OnReceiveRequest { msg_opt: *msg_opt, result: on_receive_result }
        );
    }

    public fun check_on_receive_response(called: bool) {
        assert!(called == exists<OnReceiveResponse>(@std), 0);
    }

    public fun store_on_ack_request(
        id: u64, expected_result: bool, sender: address, amount: u64
    ) {
        let chain_signer = create_signer_for_test(@std);
        move_to<OnAckRequest>(
            &chain_signer,
            OnAckRequest { id, result: expected_result, sender, amount }
        );
    }

    public fun check_on_ack_response(called: bool) {
        assert!(called == exists<OnAckResponse>(@std), 0);
    }

    public fun store_on_timeout_request(id: u64, sender: address) {
        let chain_signer = create_signer_for_test(@std);
        move_to<OnTimeoutRequest>(&chain_signer, OnTimeoutRequest { id, sender });
    }

    public fun check_on_timeout_response(called: bool) {
        assert!(called == exists<OnTimeoutResponse>(@std), 0);
    }

    public fun on_callback(id: u64, success: bool) acquires OnCallbackRequest {
        let request = borrow_global_mut<OnCallbackRequest>(@std);
        assert!(request.id == id, 0);

        // check balances
        if (success) {
            assert!(
                coin::balance(request.sender, init_metadata())
                    == 1_000_000u64 - request.amount,
                0
            );
        } else {
            assert!(coin::balance(request.sender, init_metadata()) == 1_000_000u64, 0);
        };

        // record results
        let chain_signer = create_signer_for_test(@std);
        move_to<OnCallbackResponse>(&chain_signer, OnCallbackResponse {});
    }

    public fun on_receive(
        recipient: &signer, msg_opt: &Option<ibctesting::MoveMessage>
    ): bool acquires OnReceiveRequest {
        // check counterparty balance
        let counterparty_metadata =
            ibctesting_utils::counterparty_metadata(init_metadata());
        assert!(
            coin::balance(signer::address_of(recipient), counterparty_metadata)
                == 1_000u64,
            1
        );

        let request = borrow_global_mut<OnReceiveRequest>(@std);

        assert!(option::is_some(&request.msg_opt) == option::is_some(msg_opt), 2);
        if (option::is_some(&request.msg_opt)) {
            assert!(
                option::destroy_some(request.msg_opt) == option::destroy_some(*msg_opt),
                3
            );
        };

        // record results
        let chain_signer = create_signer_for_test(@std);
        move_to<OnReceiveResponse>(&chain_signer, OnReceiveResponse {});

        // success
        request.result
    }

    public fun ibc_ack(id: u64, success: bool) acquires OnAckRequest {
        let request = borrow_global_mut<OnAckRequest>(@std);
        assert!(request.id == id, 0);
        assert!(request.result == success, 1);

        // record results
        let chain_signer = create_signer_for_test(@std);
        move_to<OnAckResponse>(&chain_signer, OnAckResponse {});

        if (success) {
            // balance should be restored
            assert!(
                coin::balance(request.sender, init_metadata())
                    == 1_000_000u64 - request.amount,
                2
            );
        } else {
            // balance should be restored
            assert!(coin::balance(request.sender, init_metadata()) == 1_000_000u64, 1);
        }
    }

    public fun ibc_timeout(id: u64) acquires OnTimeoutRequest {
        let request = borrow_global_mut<OnTimeoutRequest>(@std);
        assert!(request.id == id, 0);

        // record results
        let chain_signer = create_signer_for_test(@std);
        move_to<OnTimeoutResponse>(&chain_signer, OnTimeoutResponse {});

        // balance should be restored
        assert!(coin::balance(request.sender, init_metadata()) == 1_000_000u64, 1);
    }

    public fun init_metadata(): Object<Metadata> {
        coin::metadata(@std, utf8(b"uinit"))
    }
}
