#[test_only]
module initia_std::ibctesting {
    use std::string::{Self, String, utf8};
    use std::object;
    use std::fungible_asset::Metadata;
    use std::vector;
    use std::managed_coin;
    use std::account;
    use std::coin;
    use std::option::{Self, Option};
    use std::cosmos::{Self, Options};
    use std::json::{Self, JSONObject};
    use std::block;
    use std::address;
    use std::function_info::{
        FunctionInfo,
        new_function_info_for_testing,
        check_dispatch_type_compatibility_for_testing
    };
    use std::ibctesting_utils::{
        counterparty_symbol,
        intermediate_sender,
        create_counterparty_token
    };

    //
    // Errors
    //

    const EIBC_TESTING_IN_PROGRESS: u64 = 0x1;
    const EIBC_TESTING_PACKETS_NOT_RELAYED: u64 = 0x2;
    const ECOSMOS_MESSAGE_FAILED: u64 = 0x3;

    const ENOT_SUPPORTED_COSMOS_MESSAGE: u64 = 0x10;
    const EINVALID_TIMEOUT: u64 = 0x11;
    const EZERO_AMOUNT: u64 = 0x12;

    //
    // Chain Operations
    //

    /// Execute the requested cosmos messages and store the packets into the chain.
    public fun execute_cosmos_messages() {
        assert!(!exists<ChainStore>(@std), EIBC_TESTING_IN_PROGRESS);

        let (messages, opts) = cosmos::requested_messages();
        let packets = vector::empty();
        vector::zip(
            messages,
            opts,
            |msg, opt| {
                let transfer_req = json::unmarshal<TransferRequest>(*string::bytes(&msg));
                assert!(
                    *string::bytes(&transfer_req._type_)
                        == b"/ibc.applications.transfer.v1.MsgTransfer",
                    ENOT_SUPPORTED_COSMOS_MESSAGE
                );

                // should have at least one of timeout_height or timeout_timestamp
                assert!(
                    transfer_req.timeout_height.revision_height != 0
                        || transfer_req.timeout_timestamp != 0,
                    EINVALID_TIMEOUT
                );

                // amount should be greater than 0
                assert!(transfer_req.token.amount > 0, EZERO_AMOUNT);

                if (execute(transfer_req, opt)) {
                    vector::push_back(&mut packets, transfer_req);
                };
            }
        );

        let chain_signer = account::create_signer_for_test(@std);
        move_to<ChainStore>(
            &chain_signer, ChainStore { packets, results: vector::empty() }
        );
    }

    /// Relay the packets to the counterparty chain.
    /// If the block height or timestamp is reached to timeout of a packet, then send a timeout message.
    ///
    /// The caller must implement the `on_receive` dispatchable function to decide the success of the transfer.
    /// The caller also can use this callback to execute destination hook functions.
    ///
    /// fun on_receive(recipient: &signer, message: &Option<MoveMessage>): bool;
    public fun relay_packets(on_receive: &FunctionInfo) acquires ChainStore {
        if (!exists<ChainStore>(@std)) {
            return;
        };

        let (height, timestamp) = block::get_block_info();

        let chain_data = borrow_global_mut<ChainStore>(@std);
        vector::for_each(
            chain_data.packets,
            |packet| {
                let (message, async_callback) = unmarshal_memo(packet.memo);

                // check timeout (multiply timeout timestamp by 1_000_000_000 to convert to nanoseconds)
                if ((
                    packet.timeout_height.revision_height != 0
                        && packet.timeout_height.revision_height <= height
                )
                    || (
                        packet.timeout_timestamp != 0
                            && packet.timeout_timestamp <= timestamp * 1_000_000_000u64
                    )) {
                    vector::push_back(
                        &mut chain_data.results,
                        TransferResult { success: false, timeout: true, async_callback }
                    );

                    // return not supported yet
                    // return;
                } else {
                    // do on_receive actions
                    let denom = packet.token.denom;
                    let metadata = coin::denom_to_metadata(denom);
                    let counterparty_symbol = counterparty_symbol(metadata);
                    let counterparty_metadata_addr =
                        coin::metadata_address(@std, counterparty_symbol);
                    if (!object::object_exists<Metadata>(counterparty_metadata_addr)) {
                        create_counterparty_token(metadata);
                    };

                    let counterparty_metadata =
                        object::address_to_object<Metadata>(counterparty_metadata_addr);
                    let recipient =
                        if (option::is_some(&message)) {
                            // In order to get actual intermediate sender on destination chain, we need to put destination channel
                            // but it is not available in the packet yet. so we use source channel as a temporary solution.
                            intermediate_sender(packet.source_channel, packet.receiver)
                        } else {
                            // send to the recipient
                            address::from_sdk(packet.receiver)
                        };

                    // mint token to the recipient
                    managed_coin::mint_to(
                        &account::create_signer_for_test(@std),
                        recipient,
                        counterparty_metadata,
                        packet.token.amount
                    );

                    // execute the callback to decide the success of the transfer
                    check_dispatch_type_compatibility_for_testing(
                        &dispatchable_on_receive_function_info(), on_receive
                    );
                    let success =
                        dispatchable_on_receive(
                            &account::create_signer_for_test(recipient),
                            &message,
                            on_receive
                        );
                    vector::push_back(
                        &mut chain_data.results,
                        TransferResult { success, timeout: false, async_callback }
                    );
                }
            }
        );
    }

    public fun relay_acks_timeouts() acquires ChainStore {
        if (!exists<ChainStore>(@std)) {
            return;
        };

        let chain_data = move_from<ChainStore>(@std);
        assert!(
            vector::length(&chain_data.packets) == vector::length(&chain_data.results),
            EIBC_TESTING_PACKETS_NOT_RELAYED
        );

        vector::zip(
            chain_data.packets,
            chain_data.results,
            |packet, result| {

                // refund coin to the sender if the transfer is failed
                if (!result.success) {
                    let denom = packet.token.denom;
                    let metadata = coin::denom_to_metadata(denom);
                    let sender = address::from_sdk(packet.sender);

                    coin::transfer(
                        &account::create_signer_for_test(@std),
                        sender,
                        metadata,
                        packet.token.amount
                    );
                };

                if (result.timeout && option::is_some(&result.async_callback)) {
                    let async_callback = option::destroy_some(result.async_callback);
                    let function_info =
                        ibc_timeout_callback_function_info(
                            async_callback.module_address,
                            async_callback.module_name
                        );

                    check_dispatch_type_compatibility_for_testing(
                        &dispatchable_ibc_timeout_function_info(), &function_info
                    );
                    dispatchable_ibc_timeout(async_callback.id, &function_info);
                } else if (option::is_some(&result.async_callback)) {
                    let async_callback = option::destroy_some(result.async_callback);
                    let function_info =
                        ibc_ack_callback_function_info(
                            async_callback.module_address,
                            async_callback.module_name
                        );

                    check_dispatch_type_compatibility_for_testing(
                        &dispatchable_ibc_ack_function_info(), &function_info
                    );
                    dispatchable_ibc_ack(
                        async_callback.id, result.success, &function_info
                    );
                };
            }
        );
    }

    //
    // Internal Functions
    //

    /// Execute the transfer request and return true if the transfer is successful. Otherwise, return false.
    fun execute(transfer_req: TransferRequest, opt: Options): bool {
        let (allow_failure, callback_id, callback_fid) = cosmos::unpack_options(opt);

        // check balance to check if the sender has enough funds
        let denom = transfer_req.token.denom;
        let metadata = coin::denom_to_metadata(denom);
        let sender_addr = address::from_sdk(transfer_req.sender);
        let balance = coin::balance(sender_addr, metadata);
        if (balance < transfer_req.token.amount) {
            // balance not enough; send failure message

            // if allow_failure is false, then abort the transaction
            assert!(allow_failure, ECOSMOS_MESSAGE_FAILED);

            if (callback_id > 0) {
                let function_info = callback_function_info(callback_fid);
                check_dispatch_type_compatibility_for_testing(
                    &dispatchable_callback_function_info(), &function_info
                );
                dispatchable_callback(callback_id, false, &function_info);
            };

            return false;
        };

        // withdraw token from the sender
        let sender_signer = account::create_signer_for_test(sender_addr);
        coin::transfer(
            &sender_signer,
            @std,
            metadata,
            transfer_req.token.amount
        );

        if (callback_id > 0) {
            let function_info = callback_function_info(callback_fid);
            check_dispatch_type_compatibility_for_testing(
                &dispatchable_callback_function_info(), &function_info
            );
            dispatchable_callback(callback_id, true, &function_info);
        };

        true
    }

    fun unmarshal_memo(memo: String): (Option<MoveMessage>, Option<MoveAsyncCallback>) {
        let memo_bytes = string::bytes(&memo);
        if (vector::length(memo_bytes) == 0) {
            return (option::none<MoveMessage>(), option::none<MoveAsyncCallback>());
        };

        let memo_obj = json::unmarshal<JSONObject>(*memo_bytes);
        let move_obj = json::get_elem<JSONObject>(&memo_obj, string::utf8(b"move"));
        if (option::is_none(&move_obj)) {
            return (option::none<MoveMessage>(), option::none<MoveAsyncCallback>());
        };

        let move_obj = option::destroy_some(move_obj);
        (
            json::get_elem<MoveMessage>(&move_obj, string::utf8(b"message")),
            json::get_elem<MoveAsyncCallback>(
                &move_obj, string::utf8(b"async_callback")
            )
        )
    }

    //
    // Helper Functions
    //

    fun callback_function_info(callback_fid: String): FunctionInfo {
        let idx = string::index_of(&callback_fid, &string::utf8(b"::"));
        let module_addr = string::sub_string(&callback_fid, 0, idx);
        let callback_fid =
            string::sub_string(&callback_fid, idx + 2, string::length(&callback_fid));
        let idx = string::index_of(&callback_fid, &string::utf8(b"::"));
        let module_name = string::sub_string(&callback_fid, 0, idx);
        let function_name =
            string::sub_string(&callback_fid, idx + 2, string::length(&callback_fid));

        new_function_info_for_testing(
            address::from_string(module_addr), module_name, function_name
        )
    }

    fun ibc_ack_callback_function_info(
        module_addr: address, module_name: String
    ): FunctionInfo {
        new_function_info_for_testing(
            module_addr, module_name, string::utf8(b"ibc_ack")
        )
    }

    fun ibc_timeout_callback_function_info(
        module_addr: address, module_name: String
    ): FunctionInfo {
        new_function_info_for_testing(
            module_addr, module_name, string::utf8(b"ibc_timeout")
        )
    }

    fun dispatchable_on_receive_function_info(): FunctionInfo {
        new_function_info_for_testing(
            @std, utf8(b"ibctesting"), utf8(b"dispatchable_on_receive")
        )
    }

    fun dispatchable_callback_function_info(): FunctionInfo {
        new_function_info_for_testing(
            @std, utf8(b"ibctesting"), utf8(b"dispatchable_callback")
        )
    }

    fun dispatchable_ibc_ack_function_info(): FunctionInfo {
        new_function_info_for_testing(
            @std, utf8(b"ibctesting"), utf8(b"dispatchable_ibc_ack")
        )
    }

    fun dispatchable_ibc_timeout_function_info(): FunctionInfo {
        new_function_info_for_testing(
            @std, utf8(b"ibctesting"), utf8(b"dispatchable_ibc_timeout")
        )
    }

    //
    // Types
    //

    struct ChainStore has key, drop {
        packets: vector<TransferRequest>,
        results: vector<TransferResult>
    }

    struct TransferRequest has copy, drop, store {
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

    struct TransferResult has copy, drop, store {
        success: bool,
        timeout: bool,
        async_callback: Option<MoveAsyncCallback>
    }

    struct TimeoutHeight has copy, drop, store {
        revision_number: u64,
        revision_height: u64
    }

    struct CosmosCoin has copy, drop, store {
        denom: String,
        amount: u64
    }

    struct MoveMessage has copy, drop, store {
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<String>
    }

    struct MoveAsyncCallback has copy, drop, store {
        id: u64,
        module_address: address,
        module_name: String
    }

    //
    // Struct Unpacking
    //

    public fun new_move_message(
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<String>
    ): MoveMessage {
        MoveMessage { module_address, module_name, function_name, type_args, args }
    }

    //
    // Native Functions
    //

    native fun dispatchable_callback(
        callback_id: u64, success: bool, f: &FunctionInfo
    );
    native fun dispatchable_on_receive(
        recipient: &signer, message: &Option<MoveMessage>, f: &FunctionInfo
    ): bool;
    native fun dispatchable_ibc_ack(
        callback_id: u64, success: bool, f: &FunctionInfo
    );
    native fun dispatchable_ibc_timeout(
        callback_id: u64, f: &FunctionInfo
    );
}
