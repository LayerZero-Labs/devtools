/// This is the OFT interface that provides send, quote, and view functions for the OFT.
///
/// The OFT developer should update the name of the implementation module in the configuration section of this module.
/// Other than that, this module generally does not need to be updated by the OFT developer. As much as possible,
/// customizations should be made in the OFT implementation module.
module oapp::oapp {
    use std::fungible_asset::{FungibleAsset};
    use std::option;
    use std::option::Option;
    use std::primary_fungible_store;
    use std::signer::address_of;
    use std::string;
    use std::vector;
    use aptos_std::from_bcs;

    #[test_only]
    use std::account;

    use endpoint_v2_common::bytes32::{Self, Bytes32};
    use endpoint_v2_common::native_token;
    use endpoint_v2_common::serde;
    use oapp::oapp_core::{combine_options, lz_quote, lz_send, refund_fees};
    use oapp::oapp_store::OAPP_ADDRESS;
    use oapp::utils::hex_string_to_bytes;

    friend oapp::oapp_receive;
    friend oapp::oapp_compose;

    const STANDARD_MESSAGE_TYPE: u16 = 1;

    struct Counter has key {
        value: u64
    }

    struct ReceiveData has key {
        address1: address,
        address2: address,
        number: u256,
        counter: u64,
        raw_message: vector<u8>
    }

    fun init_module(account: &signer) {
        move_to(account, Counter { value: 0 });
        move_to(account, ReceiveData { 
            address1: @0x0, 
            address2: @0x0, 
            number: 0, 
            counter: 0,
            raw_message: vector::empty()
        });
    }

    public fun parse_message(message: vector<u8>): (address, address, u256) {
        let string_length = (
            (*vector::borrow(&message, 60) as u64) << 24 |
            (*vector::borrow(&message, 61) as u64) << 16 |
            (*vector::borrow(&message, 62) as u64) << 8 |
            (*vector::borrow(&message, 63) as u64)
        );
        
        let string_start = 64;
        let string_end = string_start + string_length;
        let string_bytes = vector::slice(&message, string_start, string_end);

        let hex_bytes = vector::slice(&string_bytes, 2, vector::length(&string_bytes));
        let hex_content = hex_string_to_bytes(string::utf8(hex_bytes));
        
        let addr1_bytes = vector::slice(&hex_content, 0, 32);
        let decoded_addr1 = from_bcs::to_address(addr1_bytes);
        
        let addr2_bytes = vector::slice(&hex_content, 32, 64);
        let decoded_addr2 = from_bcs::to_address(addr2_bytes);
        
        let hex_content_len = vector::length(&hex_content);
        let number_bytes = if (hex_content_len >= 96) {
            vector::slice(&hex_content, 64, 96)
        } else {
            vector::slice(&hex_content, 64, hex_content_len)
        };
        
        let number_u256 = 0u256;
        let j = 0;
        let num_bytes_len = vector::length(&number_bytes);
        while (j < num_bytes_len) {
            let byte_val = *vector::borrow(&number_bytes, j);
            number_u256 = (number_u256 << 8) + (byte_val as u256);
            j = j + 1;
        };

        (decoded_addr1, decoded_addr2, number_u256)
    }

    public(friend) fun lz_receive_impl(
        _src_eid: u32,
        _sender: Bytes32,
        _nonce: u64,
        _guid: Bytes32,
        _message: vector<u8>,
        _extra_data: vector<u8>,
        receive_value: Option<FungibleAsset>,
    ) acquires Counter, ReceiveData {
        option::destroy(receive_value, |value| primary_fungible_store::deposit(OAPP_ADDRESS(), value));

        let counter = borrow_global_mut<Counter>(OAPP_ADDRESS());
        counter.value = counter.value + 1;

        let (decoded_addr1, decoded_addr2, number_u256) = parse_message(_message);

        let receive_data = borrow_global_mut<ReceiveData>(OAPP_ADDRESS());
        receive_data.address1 = decoded_addr1;
        receive_data.address2 = decoded_addr2;
        receive_data.number = number_u256;
        receive_data.counter = counter.value;
        receive_data.raw_message = _message;

        // Optionally, you can add any additional logic here to handle the received message.
    }

    // todo: replicate the logic in here where sending a message must happen
    public entry fun example_message_sender(
        account: &signer,
        dst_eid: u32,
        message: vector<u8>,
        extra_options: vector<u8>,
        native_fee: u64,
    ) {
        // Check normal APT balance
        let bal = native_token::balance(address_of(account));
        assert!(bal >= native_fee, EINSUFFICIENT_BALANCE);

        // Withdraw using native_token module
        let native_fee_fa = native_token::withdraw(account, native_fee);

        // No ZRO fee in this example
        let zro_fee_fa = option::none();

        // Send the cross-chain message
        lz_send(
            dst_eid,
            message,
            combine_options(dst_eid, STANDARD_MESSAGE_TYPE, extra_options),
            &mut native_fee_fa,
            &mut zro_fee_fa,
        );

        // Refund any leftover fees back to the user
        refund_fees(address_of(account), native_fee_fa, zro_fee_fa);
    }

    #[view]
    /// Quote the network fees for a particular send
    /// @return (native_fee, zro_fee)
    // todo: replicate the logic in here where a quote is needed
    public fun example_message_quoter(
        dst_eid: u32,
        message: vector<u8>,
        extra_options: vector<u8>,
    ): (u64, u64) {
        let options = combine_options(dst_eid, STANDARD_MESSAGE_TYPE, extra_options);

        lz_quote(
            dst_eid,
            message,
            options,
            false,
        )
    }

    // ==================================================== Compose ===================================================

    public(friend) fun lz_compose_impl(
        _from: address,
        _guid: Bytes32,
        _index: u16,
        _message: vector<u8>,
        _extra_data: vector<u8>,
        _value: Option<FungibleAsset>,
    ) {
        // todo: Replace this function body with any actions that need to be run if this OApp receives a compose message
        // This only needs to be implemented if the OApp needs to *receive* composed messages
        abort ECOMPOSE_NOT_IMPLEMENTED
    }

    // =============================================== Ordered Execution ==============================================

    /// Provides the next nonce if executor options request ordered execution; returning 0 for disabled ordered
    /// execution
    public(friend) fun next_nonce_impl(_src_eid: u32, _sender: Bytes32): u64 {
        0
    }

    // ================================================== View Functions ===========================================

    #[view]
    public fun get_decoded_address1(): address acquires ReceiveData {
        borrow_global<ReceiveData>(OAPP_ADDRESS()).address1
    }

    #[view]
    public fun get_decoded_address2(): address acquires ReceiveData {
        borrow_global<ReceiveData>(OAPP_ADDRESS()).address2
    }

    #[view]
    public fun get_decoded_number(): u256 acquires ReceiveData {
        borrow_global<ReceiveData>(OAPP_ADDRESS()).number
    }

    #[view]
    public fun get_counter_value(): u64 acquires Counter {
        borrow_global<Counter>(OAPP_ADDRESS()).value
    }

    #[view]
    public fun get_raw_message(): vector<u8> acquires ReceiveData {
        borrow_global<ReceiveData>(OAPP_ADDRESS()).raw_message
    }

    // ================================================== Error Codes =================================================

    const ECOMPOSE_NOT_IMPLEMENTED: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const EINVALID_HEX_CHAR: u64 = 3;
    const EINVALID_LENGTH: u64 = 4;


}