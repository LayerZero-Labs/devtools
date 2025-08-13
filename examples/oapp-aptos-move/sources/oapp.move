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
    use std::string::{String, utf8, bytes as string_bytes};
    use std::vector;

    use endpoint_v2_common::bytes32::Bytes32;
    use endpoint_v2_common::native_token;
    use endpoint_v2_common::serde::{extract_u256, append_u256};
    use oapp::oapp_core::{combine_options, lz_quote, lz_send, refund_fees};
    use oapp::oapp_store::OAPP_ADDRESS;

    friend oapp::oapp_receive;
    friend oapp::oapp_compose;

    const STANDARD_MESSAGE_TYPE: u16 = 1;

    struct Message has key {
        message: String
    }

    fun init_module(account: &signer) {
        move_to(account, Message { message: utf8(b"") });
    }

    #[view]
    public fun get_message(): String acquires Message {
        borrow_global<Message>(@oapp).message
    }

    /// Decodes an ABI-encoded string from bytes
    /// ABI encoding format for string:
    /// - First 32 bytes: offset to string data
    /// - Next 32 bytes: length of the string
    /// - Remaining bytes: the actual string data (padded to 32-byte chunks)
    public fun decode_abi_string(data: vector<u8>): String {
        let data_len = vector::length(&data);
        assert!(data_len >= 64, EINVALID_ABI_ENCODING); // At least offset + length

        // Read offset
        let position = 0;
        let offset = extract_u256(&data, &mut position);
        assert!(offset == 32, EINVALID_ABI_ENCODING);

        // Read string length
        let str_len = extract_u256(&data, &mut position);

        // Extract string bytes
        let str_bytes = vector::empty<u8>();
        let str_len_u64 = (str_len as u64);
        for (i in 0..str_len_u64) {
            vector::push_back(&mut str_bytes, *vector::borrow(&data, 64 + i));
        };

        utf8(str_bytes)
    }

    /// Encodes a string into ABI format
    /// Returns bytes that can be decoded by Solidity's abi.decode(data, (string))
    public fun encode_abi_string(str: String): vector<u8> {
        let str_bytes = string_bytes(&str);
        let str_len = vector::length(str_bytes);
        let encoded = vector::empty<u8>();
        
        append_u256(&mut encoded, 32);
        append_u256(&mut encoded, str_len as u256);

        // Add string data
        for (i in 0..str_len) {
            vector::push_back(&mut encoded, *vector::borrow(str_bytes, i));
        };
        
        // Add padding to next 32-byte boundary
        let padding_needed = if (str_len % 32 == 0) { 0 } else { 32 - (str_len % 32) };
        for (i in 0..padding_needed) {
            vector::push_back(&mut encoded, 0);
        };
        
        encoded
    }

    public(friend) fun lz_receive_impl(
        _src_eid: u32,
        _sender: Bytes32,
        _nonce: u64,
        _guid: Bytes32,
        _message: vector<u8>,
        _extra_data: vector<u8>,
        receive_value: Option<FungibleAsset>,
    ) acquires Message {
        // Deposit any received value
        option::destroy(receive_value, |value| primary_fungible_store::deposit(OAPP_ADDRESS(), value));

        // Decode the ABI-encoded string message
        let decoded_string = decode_abi_string(_message);

        // Store the decoded message
        let msg_ref = borrow_global_mut<Message>(@oapp);
        msg_ref.message = decoded_string;

        // todo: Perform any actions with received message here
    }


    /// Send a string message to another chain (like an EVM chain)
    /// The string will be ABI-encoded so EVM contracts can decode it
    public entry fun send_string(
        account: &signer,
        dst_eid: u32,
        message: String,
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

        // ABI encode the string for EVM compatibility
        let encoded_message = encode_abi_string(message);

        // Send the cross-chain message
        lz_send(
            dst_eid,
            encoded_message,
            combine_options(dst_eid, STANDARD_MESSAGE_TYPE, extra_options),
            &mut native_fee_fa,
            &mut zro_fee_fa,
        );

        // Refund any leftover fees back to the user
        refund_fees(address_of(account), native_fee_fa, zro_fee_fa);
    }

    #[view]
    /// Quote the network fees for sending a string message
    /// @return (native_fee, zro_fee)
    public fun quote_send_string(
        dst_eid: u32,
        message: String,
        extra_options: vector<u8>,
    ): (u64, u64) {
        // ABI encode the string to get accurate quote
        let encoded_message = encode_abi_string(message);
        let options = combine_options(dst_eid, STANDARD_MESSAGE_TYPE, extra_options);

        lz_quote(
            dst_eid,
            encoded_message,
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

    // ================================================== Error Codes =================================================

    const ECOMPOSE_NOT_IMPLEMENTED: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const EINVALID_ABI_ENCODING: u64 = 3;
    const ESTRING_TOO_LARGE: u64 = 4;
}
