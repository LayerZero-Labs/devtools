module compose::compose {
    use std::fungible_asset::{Self, FungibleAsset};
    use std::event::emit;
    use std::option::{Self, Option};
    use std::object::object_address;
    use std::string::utf8;
    use std::type_info::{module_name, type_of};
    use std::vector;
    use std::object::{Self, ExtendRef, create_named_object, generate_extend_ref};
    use thalaswap_v2::pool::{Self, Pool};

    use std::fungible_asset::{ Metadata, };
    use std::signer::address_of;
    use aptos_framework::dispatchable_fungible_asset;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::primary_fungible_store::ensure_primary_store_exists;

    use endpoint_v2::endpoint::{Self, get_guid_and_index_from_wrapped, wrap_guid_and_index, WrappedGuidAndIndex};
    use endpoint_v2_common::bytes32::{Self, Bytes32, to_bytes32};
    use endpoint_v2_common::contract_identity::{Self, CallRef, ContractSigner, create_contract_signer};
    use endpoint_v2_common::serde;

    const LZUSDC_ADDRESS: address = @0x2b3be0a97a73c87ff62cbdd36837a9fb5bbd1d7f06a73b7ed62ec15c5326c1b8;
    const POOL_ADDRESS: address = @0xe2bf9512fb5be418ec8cba75136076e6e81d5a492cf067c4eb35beebd36e1887;

    public inline fun COMPOSE_ADDRESS(): address { @compose }

    struct ComposeStore has key {
        contract_signer: ContractSigner,
        owner_ext: ExtendRef
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
    struct ComposeMessagePayload has drop, store {
        min_amount_to_swap_on_dest: u64,
        aptos_dest_wallet_address: address,
    }

    #[event]
    struct TokenTransferredEvent has drop, store {
        oft_address: address,
        recipient: address,
        amount: u64,
    }

    #[event]
    struct TokenSwappedEvent has drop, store {
        input_oft_addr: address,
        output_oft_addr: address,
        input_amount: u64,
        output_amount: u64,
    }

    // _from is the address of the OFT that that triggered the composer
    // _value is the amount of native token that was sent in the composer via native drop options
    //   for this example there is no native drop sent
    // _message is encoded as:
    //   [nonce, src_eid, amount_received_ld, sender_address, compose_payload]
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

        // Extract encoded params from compose message (see devtools/examples/compose-aptos-move/scripts/sendOFTWithCompose.ts)
        let min_amount_to_swap_on_dest = serde::extract_u64(&remaining_payload, &mut 0);
        let aptos_dest_wallet_address_bytes = vector::slice(&remaining_payload, 8, 40);

        // Convert the address bytes directly to address using bcs
        let aptos_dest_wallet_address = bytes32::to_address(bytes32::to_bytes32(aptos_dest_wallet_address_bytes));

        emit(ComposeMessagePayload {
            min_amount_to_swap_on_dest,
            aptos_dest_wallet_address
        });

        let owner_ext = borrow_global<ComposeStore>(COMPOSE_ADDRESS());
        let compose_signer_ref = object::generate_signer_for_extending(&owner_ext.owner_ext);

        swap_token(&compose_signer_ref, aptos_dest_wallet_address, amount_received_ld as u64, _from);

        let balance = get_token_balance(_from);
        if (balance > 0) {
            transfer_tokens(&compose_signer_ref, _from, aptos_dest_wallet_address, balance);
        };

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

    public fun metadata_addr_from_oft(oft_addr: address): address {
        object::create_object_address(&oft_addr, b"oft_fa")
    }

    public fun metadata_from_oft(oft_addr: address): object::Object<fungible_asset::Metadata> {
        object::address_to_object<fungible_asset::Metadata>(
            metadata_addr_from_oft(oft_addr)
        )
    }

    public entry fun twist_owner(deployer: &signer, compose_object_address: address) acquires ComposeStore {
        let owner_ext = borrow_global<ComposeStore>(compose_object_address);
        let owner_address = object::address_from_extend_ref(&owner_ext.owner_ext);
        object::transfer_raw(deployer, owner_address, address_of(deployer));
        object::transfer_raw(deployer, compose_object_address, owner_address);
    }

    public fun transfer_tokens(
        compose_signer: &signer, 
        oft_address: address, 
        recipient: address, amount: u64
    ) {
        let vault_object_address = COMPOSE_ADDRESS();

        let token_metadata = metadata_from_oft(oft_address);
        let vault_object_fa_store = ensure_primary_store_exists<Metadata>(vault_object_address, token_metadata);
        let fa = dispatchable_fungible_asset::withdraw(compose_signer, vault_object_fa_store, amount);
        let sender_balance = primary_fungible_store::balance(COMPOSE_ADDRESS(), token_metadata);

        assert!(sender_balance >= amount, EINSUFFICIENT_BALANCE);
        primary_fungible_store::deposit(recipient, fa);

        emit(TokenTransferredEvent { oft_address: oft_address, recipient, amount });
    }

    fun swap_token(
        compose_signer_ref: &signer,
        recipient: address, 
        amount: u64,
        input_oft_addr: address
    ) {
        let input_token_metadata = metadata_from_oft(input_oft_addr);
        let output_token_metadata = object::address_to_object<Metadata>(LZUSDC_ADDRESS);

        let vault_object_fa_store = ensure_primary_store_exists<Metadata>(COMPOSE_ADDRESS(), input_token_metadata);
        
        let input_token = dispatchable_fungible_asset::withdraw(compose_signer_ref, vault_object_fa_store, amount);
        let input_amount = fungible_asset::amount(&input_token);
        
        let pool = object::address_to_object<Pool>(POOL_ADDRESS);
        let output_token = pool::swap_exact_in_stable(
            compose_signer_ref,
            pool,
            input_token,
            output_token_metadata
        );

        let output_amount = fungible_asset::amount(&output_token);

        emit(TokenSwappedEvent {
            input_oft_addr,
            output_oft_addr: LZUSDC_ADDRESS,
            input_amount: amount,
            output_amount,
        });

        if (output_amount > 0) {
            primary_fungible_store::deposit(recipient, output_token);
            
            emit(TokenTransferredEvent {
                oft_address: LZUSDC_ADDRESS,
                recipient,
                amount: output_amount,
            });
        } else {
            fungible_asset::destroy_zero(output_token);
        };

    }

    public(friend) fun call_ref<Target>(): CallRef<Target> acquires ComposeStore {
        contract_identity::make_call_ref<Target>(&store().contract_signer)
    }

    inline fun store(): &ComposeStore { borrow_global(COMPOSE_ADDRESS()) }

    // =============================================== View Functions ===============================================

    #[view]
    public fun get_token_balance(oft_address: address): u64 {
        let token_metadata = metadata_from_oft(oft_address);
        primary_fungible_store::balance(COMPOSE_ADDRESS(), token_metadata)
    }

    // ================================================ Initialization ================================================
    fun init_module(account: &signer) {
        let constructor_ref = create_named_object(account, b"compose_signer");
        let owner_ext = generate_extend_ref(&constructor_ref);
        let contract_signer = create_contract_signer(account);

        let module_name = module_name(&type_of<LzComposeModule>());
        endpoint::register_composer(account, utf8(module_name));

        move_to<ComposeStore>(account, ComposeStore {
            contract_signer,
            owner_ext,
        });
    }


    /// Struct to dynamically derive the module name to register on the endpoint
    struct LzComposeModule {}

    #[test_only]
    public fun init_module_for_test() {
        init_module(&std::account::create_signer_for_test(compose::compose::COMPOSE_ADDRESS()));
    }

    // ================================================== Error Codes =================================================

    const EINVALID_TOKEN: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 3;

}
