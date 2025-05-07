module compose::compose {
    use std::fungible_asset::{Self, FungibleAsset};
    use std::event::emit;
    use std::option::{Self, Option};
    use std::object::object_address;
    use std::string::utf8;
    use std::type_info::{module_name, type_of};
    use std::vector;
    use std::primary_fungible_store;
    use std::object::{Self, ExtendRef, create_named_object, generate_extend_ref, generate_signer_for_extending};

    use endpoint_v2::endpoint::{Self, get_guid_and_index_from_wrapped, wrap_guid_and_index, WrappedGuidAndIndex};
    use endpoint_v2_common::bytes32::{Self, Bytes32, to_bytes32, to_address};
    use endpoint_v2_common::contract_identity::{Self, CallRef, ContractSigner, create_contract_signer};
    use endpoint_v2_common::serde;

    struct ComposeStore has key {
        contract_signer: ContractSigner,
        extend_ref: ExtendRef,
    }

    #[event]
    struct ValueDepositedEvent has drop, store {
        recipient: address,
        amount: u64,
    }

    #[event]
    struct ComposeWithValueReceivedEvent has drop, store {
        from: address,
        guid: Bytes32,
        index: u16,
        message: vector<u8>,
        extra_data: vector<u8>,
        has_value: bool,
        value_amount: u64
    }

    #[event]
    struct ComposeWithNoValueReceivedEvent has drop, store {
        from: address,
        guid: vector<u8>,
        index: u16,
        message: vector<u8>,
        extra_data: vector<u8>
    }

    #[event]
    struct MessageBreakdown has drop, store {
        nonce: u64,
        src_eid: u32,
        amount_received_ld: u256,
        compose_payload_length: u64,
        compose_payload: vector<u8>,
        sender_address: vector<u8>,
        remaining_payload: vector<u8>,
    }

    #[event]
    struct ComposeMsgPayload has drop, store {
        remaining_payload_length: u64,
        min_amount_to_swap_on_dest: u64,
        aptos_dest_wallet_address_bytes: vector<u8>,
        aptos_dest_wallet_address_bytes_length: u64,
    }

    #[event]
    struct AptosDestWalletAddress has drop, store {
        aptos_dest_wallet_address: address,
    }

    #[event]
    struct TokenTransferredEvent has drop, store {
        token_address: address,
        recipient: address,
        amount: u64,
    }

    #[event]
    struct TokenMetadata has drop, store {
        oft_address: address,
        token_metadata_address: address,
    }

    public inline fun COMPOSE_ADDRESS(): address { @compose }


    fun call_ref<Target>(): CallRef<Target> acquires ComposeStore {
        contract_identity::make_call_ref<Target>(&store().contract_signer)
    }

    inline fun store(): &ComposeStore { borrow_global(COMPOSE_ADDRESS()) }

    // _from is the address of the OFT that that triggered the composer
    // _value is the amount of native token that was sent in the composer native drop options
    // _message is encoded as:
    //    [nonce, src_eid, amount_received_ld, sender_address, compose_payload]
    fun lz_compose_impl(
        _from: address,
        _guid: Bytes32,
        _index: u16,
        _message: vector<u8>,
        _extra_data: vector<u8>,
        _value: Option<FungibleAsset>,
    ) acquires ComposeStore {
        let (nonce, src_eid, amount_received_ld, compose_payload) = decode_message(&_message);
        let (sender_address, remaining_payload) = extract_sender_and_payload(&compose_payload);

        emit(MessageBreakdown {
            nonce,
            src_eid,
            amount_received_ld,
            compose_payload_length: vector::length(&compose_payload),
            compose_payload,
            sender_address,
            remaining_payload,
        });

        let remaining_payload_length = vector::length(&remaining_payload);
        // Extract encoded params from compose message in examples/compose-aptos-move/scripts/sendOFTWithCompose.ts
        let min_amount_to_swap_on_dest = serde::extract_u64(&remaining_payload, &mut 0);
        let aptos_dest_wallet_address_bytes = vector::slice(&remaining_payload, 8, 40);
        let aptos_dest_wallet_address_bytes_length = vector::length(&aptos_dest_wallet_address_bytes);

        emit(ComposeMsgPayload {
            remaining_payload_length,
            min_amount_to_swap_on_dest,
            aptos_dest_wallet_address_bytes,
            aptos_dest_wallet_address_bytes_length,
        });

        // Convert the address bytes directly to address using bcs
        let aptos_dest_wallet_address = bytes32::to_address(bytes32::to_bytes32(aptos_dest_wallet_address_bytes));

        emit(AptosDestWalletAddress {
            aptos_dest_wallet_address,
        });
        
        transfer_oft_tokens(_from, aptos_dest_wallet_address, (amount_received_ld as u64));

        if (option::is_some(&_value)) {
            let asset = option::extract(&mut _value);
            
            let contract_address = COMPOSE_ADDRESS();
            primary_fungible_store::deposit(contract_address, asset);
        };
        
        option::destroy_none(_value);
    }

    fun decode_message(message: &vector<u8>): (u64, u32, u256, vector<u8>) {
        let offset = 0;
        
        // Extract nonce (u64) - 8 bytes
        let nonce = serde::extract_u64(message, &mut offset);
        
        // Extract src_eid (u32) - 4 bytes
        let src_eid = serde::extract_u32(message, &mut offset);
        
        // Extract amount_received_ld (u256) - 32 bytes
        let amount_received_ld = serde::extract_u256(message, &mut offset);
        
        // Extract compose_payload (remaining bytes)
        let compose_payload = vector::empty<u8>();
        let message_length = vector::length(message);
        if (offset < message_length) {
            compose_payload = vector::slice(message, offset, message_length);
        };
        
        (nonce, src_eid, amount_received_ld, compose_payload)
    }

    fun extract_sender_and_payload(compose_payload: &vector<u8>): (vector<u8>, vector<u8>) {
        let payload_length = vector::length(compose_payload);
        
        if (payload_length < 32) {
            return (vector::empty(), *compose_payload)
        };
        
        let address_slot_length = 32;
        let address_slot = vector::slice(compose_payload, 0, address_slot_length);
        
        let remaining_payload = if (payload_length > address_slot_length) {
            vector::slice(compose_payload, address_slot_length, payload_length)
        } else {
            vector::empty()
        };
        
        (address_slot, remaining_payload)
    }

    /// LZ Compose function for self-execution
    public entry fun lz_compose(
        from: address,
        guid: vector<u8>,
        index: u16,
        message: vector<u8>,
        extra_data: vector<u8>,
    ) acquires ComposeStore, {
        emit(ComposeWithNoValueReceivedEvent {
            from,
            guid,
            index,
            message,
            extra_data,
        });

        let guid = to_bytes32(guid);
        endpoint::clear_compose(&call_ref(), from, wrap_guid_and_index(guid, index), message);

        lz_compose_impl(
            from,
            guid,
            index,
            message,
            extra_data,
            option::none(),
        )
    }

    /// LZ Compose function to be called by the Executor
    /// This is able to be provided a compose value in the form of a FungibleAsset
    /// For self-executing with a value, this should be called with a script
    public fun lz_compose_with_value(
        from: address,
        guid_and_index: WrappedGuidAndIndex,
        message: vector<u8>,
        extra_data: vector<u8>,
        value: Option<FungibleAsset>,
    ) acquires ComposeStore {
        // Make sure that the value provided is of the native token type
        assert!(option::is_none(&value) || is_native_token(option::borrow(&value)), EINVALID_TOKEN);

        // Unwrap the guid and index from the wrapped guid and index, this wrapping
        let (guid, index) = get_guid_and_index_from_wrapped(&guid_and_index);

        // Check if there's a value and get its amount
        let has_value = option::is_some(&value);
        let value_amount = if (has_value) {
            fungible_asset::amount(option::borrow(&value))
        } else {
            0
        };

        emit(ComposeWithValueReceivedEvent {
            from,
            guid,
            index,
            message,
            extra_data,
            has_value,
            value_amount
        });

        endpoint::clear_compose(&call_ref(), from, guid_and_index, message);

        lz_compose_impl(
            from,
            guid,
            index,
            message,
            extra_data,
            value,
        );
    }

    public fun is_native_token(token: &FungibleAsset): bool {
        object_address(&fungible_asset::asset_metadata(token)) == @native_token_metadata_address
    }

    // =============================================== View Functions ===============================================

    #[view]
    public fun get_token_balance(oft_address: address): u64 {
        let token_metadata_address = metadata_addr_from_oft(oft_address);

        emit(TokenMetadata {
            oft_address,
            token_metadata_address,
        });

        let token_metadata = metadata_from_oft(oft_address);
        primary_fungible_store::balance(COMPOSE_ADDRESS(), token_metadata)
    }

    public fun metadata_addr_from_oft(oft_addr: address): address {
        // deterministic; no storage read
        object::create_object_address(&oft_addr, b"oft_fa")
    }

    public fun metadata_from_oft(oft_addr: address): object::Object<fungible_asset::Metadata> {
        object::address_to_object<fungible_asset::Metadata>(
            metadata_addr_from_oft(oft_addr)
        )
    }

    #[view]
    public fun get_token_metadata(oft_address: address): object::Object<fungible_asset::Metadata> {
        metadata_from_oft(oft_address)
    }

    public entry fun transfer_oft_tokens(oft_address: address, recipient: address, amount: u64) acquires ComposeStore {
        let compose_store = borrow_global<ComposeStore>(COMPOSE_ADDRESS());
        
        let signer_ref = &generate_signer_for_extending(&compose_store.extend_ref);
        
        let token_metadata = metadata_from_oft(oft_address);
        
        let sender_balance = primary_fungible_store::balance(COMPOSE_ADDRESS(), token_metadata);
        assert!(sender_balance >= amount, EINSUFFICIENT_BALANCE);
        
        primary_fungible_store::transfer(
            signer_ref,
            token_metadata,
            recipient,
            amount
        );
        
        emit(TokenTransferredEvent {
            token_address: oft_address,
            recipient,
            amount,
        });
    }

    // ================================================ Initialization ================================================

    fun init_module(account: &signer) {
        let constructor_ref = create_named_object(account, b"compose_signer");
        let extend_ref = generate_extend_ref(&constructor_ref);
        let contract_signer = create_contract_signer(account);


        move_to<ComposeStore>(account, ComposeStore {
            contract_signer,
            extend_ref,
        });

        let module_name = module_name(&type_of<LzComposeModule>());
        endpoint::register_composer(account, utf8(module_name));
    }
    /// Struct to dynamically derive the module name to register on the endpoint
    struct LzComposeModule {}

    #[test_only]
    public fun init_module_for_test() {
        init_module(&std::account::create_signer_for_test(compose::compose::COMPOSE_ADDRESS()));
    }

    // ================================================== Error Codes =================================================

    const EINVALID_TOKEN: u64 = 1;
    const EUNAUTHORIZED: u64 = 2;
    const EINSUFFICIENT_BALANCE: u64 = 3;

}
