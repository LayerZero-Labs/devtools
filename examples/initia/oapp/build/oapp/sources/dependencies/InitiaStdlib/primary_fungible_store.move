/// This module provides a way for creators of fungible assets to enable support for creating primary (deterministic)
/// stores for their users. This is useful for assets that are meant to be used as a currency, as it allows users to
/// easily create a store for their account and deposit/withdraw/transfer fungible assets to/from it.
///
/// The transfer flow works as below:
/// 1. The sender calls `transfer` on the fungible asset metadata object to transfer `amount` of fungible asset to
///   `recipient`.
/// 2. The fungible asset metadata object calls `ensure_primary_store_exists` to ensure that both the sender's and the
/// recipient's primary stores exist. If either doesn't, it will be created.
/// 3. The fungible asset metadata object calls `withdraw` on the sender's primary store to withdraw `amount` of
/// fungible asset from it. This emits an withdraw event.
/// 4. The fungible asset metadata object calls `deposit` on the recipient's primary store to deposit `amount` of
/// fungible asset to it. This emits an deposit event.
module initia_std::primary_fungible_store {
    use initia_std::dispatchable_fungible_asset;
    use initia_std::fungible_asset::{
        Self,
        FungibleAsset,
        FungibleStore,
        Metadata,
        MintRef,
        TransferRef,
        BurnRef
    };
    use initia_std::object::{Self, Object, ConstructorRef, DeriveRef};
    use initia_std::table::{Self, Table};
    use initia_std::event;
    use initia_std::account;

    use std::option::{Self, Option};
    use std::signer;
    use std::string::String;
    use std::vector;

    friend initia_std::coin;

    /// A resource that holds the derive ref for the fungible asset metadata object. This is used to create primary
    /// stores for users with deterministic addresses so that users can easily deposit/withdraw/transfer fungible
    /// assets.
    struct DeriveRefPod has key {
        metadata_derive_ref: DeriveRef
    }

    struct ModuleStore has key {
        issuers: Table<address /* metadata */, address /* issuer */>,
        user_stores: Table<address /* user */, Table<address /* metadata */, address /* store */>>
    }

    #[event]
    struct PrimaryStoreCreatedEvent has drop, store {
        owner_addr: address,
        store_addr: address,
        metadata_addr: address
    }

    fun init_module(chain: &signer) {
        move_to(
            chain,
            ModuleStore {
                issuers: table::new(),
                user_stores: table::new()
            }
        )
    }

    /// Create a fungible asset with primary store support. When users transfer fungible assets to each other, their
    /// primary stores will be created automatically if they don't exist. Primary stores have deterministic addresses
    /// so that users can easily deposit/withdraw/transfer fungible assets.
    public fun create_primary_store_enabled_fungible_asset(
        constructor_ref: &ConstructorRef,
        maximum_supply: Option<u128>,
        name: String,
        symbol: String,
        decimals: u8,
        icon_uri: String,
        project_uri: String
    ) acquires ModuleStore {
        fungible_asset::add_fungibility(
            constructor_ref,
            maximum_supply,
            name,
            symbol,
            decimals,
            icon_uri,
            project_uri
        );

        let metadata = object::object_from_constructor_ref<Metadata>(constructor_ref);
        let metadata_signer = &object::generate_signer(constructor_ref);
        move_to(
            metadata_signer,
            DeriveRefPod {
                metadata_derive_ref: object::generate_derive_ref(constructor_ref)
            }
        );

        // record issuers for cosmos side query
        if (exists<ModuleStore>(@initia_std)) {
            let module_store = borrow_global_mut<ModuleStore>(@initia_std);
            table::add(
                &mut module_store.issuers,
                object::object_address(&metadata),
                object::owner(metadata)
            );
        }
    }

    /// Ensure that the primary store object for the given address exists. If it doesn't, create it.
    public fun ensure_primary_store_exists<T: key>(
        owner: address, metadata: Object<T>
    ): Object<FungibleStore> acquires DeriveRefPod, ModuleStore {
        if (!primary_store_exists(owner, metadata)) {
            create_primary_store(owner, metadata)
        } else {
            primary_store(owner, metadata)
        }
    }

    /// Create a primary store object to hold fungible asset for the given address.
    public fun create_primary_store<T: key>(
        owner_addr: address, metadata: Object<T>
    ): Object<FungibleStore> acquires DeriveRefPod, ModuleStore {
        let metadata_addr = object::object_address(&metadata);
        object::address_to_object<Metadata>(metadata_addr);

        let derive_ref = &borrow_global<DeriveRefPod>(metadata_addr).metadata_derive_ref;
        let constructor_ref =
            &object::create_user_derived_object(owner_addr, derive_ref, false);

        // Disable ungated transfer as deterministic stores shouldn't be transferrable.
        let transfer_ref = &object::generate_transfer_ref(constructor_ref);
        object::disable_ungated_transfer(transfer_ref);

        let store = fungible_asset::create_store(constructor_ref, metadata);
        let store_addr = object::address_from_constructor_ref(constructor_ref);

        // record owner store to table for cosmos side query
        if (exists<ModuleStore>(@initia_std)) {
            let module_store = borrow_global_mut<ModuleStore>(@initia_std);
            if (!table::contains(&module_store.user_stores, owner_addr)) {
                table::add(
                    &mut module_store.user_stores,
                    owner_addr,
                    table::new()
                );
            };

            let user_stores = table::borrow_mut(
                &mut module_store.user_stores, owner_addr
            );

            table::add(user_stores, metadata_addr, store_addr);
        };

        // emit store created event
        event::emit(PrimaryStoreCreatedEvent { owner_addr, store_addr, metadata_addr });
        store
    }

    #[view]
    /// Get the address of the issuer for the given metadata object.
    public fun issuer<T: key>(metadata: Object<T>): address acquires ModuleStore {
        let module_store = borrow_global<ModuleStore>(@initia_std);
        *table::borrow(
            &module_store.issuers,
            object::object_address(&metadata)
        )
    }

    #[view]
    /// Get the address of the primary store for the given account.
    public fun primary_store_address<T: key>(
        owner: address, metadata: Object<T>
    ): address {
        let metadata_addr = object::object_address(&metadata);
        object::create_user_derived_object_address(owner, metadata_addr)
    }

    #[view]
    /// Get the primary store object for the given account.
    public fun primary_store<T: key>(owner: address, metadata: Object<T>):
        Object<FungibleStore> {
        let store = primary_store_address(owner, metadata);
        object::address_to_object<FungibleStore>(store)
    }

    #[view]
    /// Return whether the given account's primary store exists.
    public fun primary_store_exists<T: key>(
        account: address, metadata: Object<T>
    ): bool {
        fungible_asset::store_exists(primary_store_address(account, metadata))
    }

    #[view]
    /// Return whether the given account's primary store is frozen.
    public fun is_frozen<T: key>(account: address, metadata: Object<T>): bool {
        if (primary_store_exists(account, metadata)) {
            fungible_asset::is_frozen(primary_store(account, metadata))
        } else { false }
    }

    #[view]
    /// Get the balance of `account`'s primary store.
    public fun balance<T: key>(account: address, metadata: Object<T>): u64 {
        if (primary_store_exists(account, metadata)) {
            fungible_asset::balance(primary_store(account, metadata))
        } else { 0 }
    }

    #[view]
    /// Get the balances of `account`'s primary store of all fungible assets.
    public fun balances(
        account: address, start_after: Option<address>, limit: u8
    ): (vector<Object<Metadata>>, vector<u64>) acquires ModuleStore {
        let module_store = borrow_global<ModuleStore>(@initia_std);
        let account_stores = table::borrow(&module_store.user_stores, account);
        let iter = table::iter(account_stores, option::none(), start_after, 2);

        let metadata_vec: vector<Object<Metadata>> = vector[];
        let balance_vec: vector<u64> = vector[];

        while (table::prepare<address, address>(iter)
            && vector::length(&balance_vec) < (limit as u64)) {
            let (metadata_addr, store_addr) = table::next<address, address>(iter);
            let metadata = object::address_to_object<Metadata>(metadata_addr);
            let store = object::address_to_object<FungibleStore>(*store_addr);

            vector::push_back(&mut metadata_vec, metadata);
            vector::push_back(
                &mut balance_vec,
                fungible_asset::balance(store)
            );
        };

        (metadata_vec, balance_vec)
    }

    /// Deposit fungible asset `fa` to the given account's primary store.
    ///
    /// This function is only callable by the chain.
    public(friend) fun sudo_deposit(
        owner: address, fa: FungibleAsset
    ) acquires DeriveRefPod, ModuleStore {
        let metadata = fungible_asset::asset_metadata(&fa);
        let store = ensure_primary_store_exists(owner, metadata);
        fungible_asset::sudo_deposit(store, fa);

        // create cosmos side account
        if (!account::exists_at(owner)) {
            let _acc_num = account::create_account(owner);
        };
    }

    /// Transfer `amount` of fungible asset from sender's primary store to receiver's primary store.
    ///
    /// This function is only callable by the chain.
    public(friend) fun sudo_transfer<T: key>(
        sender: &signer,
        metadata: Object<T>,
        recipient: address,
        amount: u64
    ) acquires DeriveRefPod, ModuleStore {
        let sender_store =
            ensure_primary_store_exists(signer::address_of(sender), metadata);
        let recipient_store = ensure_primary_store_exists(recipient, metadata);
        fungible_asset::sudo_transfer(sender, sender_store, recipient_store, amount);
    }

    /// Withdraw `amount` of fungible asset from the given account's primary store.
    public fun withdraw<T: key>(
        owner: &signer, metadata: Object<T>, amount: u64
    ): FungibleAsset {
        if (amount == 0) {
            return fungible_asset::zero(metadata)
        };

        let store = primary_store(signer::address_of(owner), metadata);
        dispatchable_fungible_asset::withdraw(owner, store, amount)
    }

    /// Deposit fungible asset `fa` to the given account's primary store.
    public fun deposit(owner: address, fa: FungibleAsset) acquires DeriveRefPod, ModuleStore {
        let metadata = fungible_asset::asset_metadata(&fa);
        let store = ensure_primary_store_exists(owner, metadata);
        dispatchable_fungible_asset::deposit(store, fa);

        // create cosmos side account
        if (!account::exists_at(owner)) {
            let _acc_num = account::create_account(owner);
        };
    }

    /// Transfer `amount` of fungible asset from sender's primary store to receiver's primary store.
    public entry fun transfer<T: key>(
        sender: &signer,
        metadata: Object<T>,
        recipient: address,
        amount: u64
    ) acquires DeriveRefPod, ModuleStore {
        let sender_store =
            ensure_primary_store_exists(signer::address_of(sender), metadata);
        let recipient_store = ensure_primary_store_exists(recipient, metadata);
        dispatchable_fungible_asset::transfer(
            sender, sender_store, recipient_store, amount
        );

        // create cosmos side account
        if (!account::exists_at(recipient)) {
            let _acc_num = account::create_account(recipient);
        };
    }

    /// Transfer `amount` of fungible asset from sender's primary store to receiver's primary store.
    /// Use the minimum deposit assertion api to make sure recipient will receive a minimum amount of fund.
    public entry fun transfer_assert_minimum_deposit<T: key>(
        sender: &signer,
        metadata: Object<T>,
        recipient: address,
        amount: u64,
        expected: u64
    ) acquires DeriveRefPod, ModuleStore {
        let sender_store =
            ensure_primary_store_exists(signer::address_of(sender), metadata);
        let recipient_store = ensure_primary_store_exists(recipient, metadata);
        dispatchable_fungible_asset::transfer_assert_minimum_deposit(
            sender,
            sender_store,
            recipient_store,
            amount,
            expected
        );
    }

    /// Mint to the primary store of `owner`.
    public fun mint(mint_ref: &MintRef, owner: address, amount: u64) acquires DeriveRefPod, ModuleStore {
        let primary_store =
            ensure_primary_store_exists(
                owner,
                fungible_asset::mint_ref_metadata(mint_ref)
            );

        fungible_asset::mint_to(mint_ref, primary_store, amount);

        // create cosmos side account
        if (!account::exists_at(owner)) {
            let _acc_num = account::create_account(owner);
        };
    }

    /// Burn from the primary store of `owner`.
    public fun burn(burn_ref: &BurnRef, owner: address, amount: u64) {
        let primary_store =
            primary_store(
                owner,
                fungible_asset::burn_ref_metadata(burn_ref)
            );
        fungible_asset::burn_from(burn_ref, primary_store, amount);
    }

    /// Freeze/Unfreeze the primary store of `owner`.
    public fun set_frozen_flag(
        transfer_ref: &TransferRef, owner: address, frozen: bool
    ) acquires DeriveRefPod, ModuleStore {
        let primary_store =
            ensure_primary_store_exists(
                owner,
                fungible_asset::transfer_ref_metadata(transfer_ref)
            );
        fungible_asset::set_frozen_flag(transfer_ref, primary_store, frozen);
    }

    /// Withdraw from the primary store of `owner` ignoring frozen flag.
    public fun withdraw_with_ref(
        transfer_ref: &TransferRef, owner: address, amount: u64
    ): FungibleAsset {
        let from_primary_store =
            primary_store(
                owner,
                fungible_asset::transfer_ref_metadata(transfer_ref)
            );
        fungible_asset::withdraw_with_ref(transfer_ref, from_primary_store, amount)
    }

    /// Deposit from the primary store of `owner` ignoring frozen flag.
    public fun deposit_with_ref(
        transfer_ref: &TransferRef, owner: address, fa: FungibleAsset
    ) acquires DeriveRefPod, ModuleStore {
        let from_primary_store =
            ensure_primary_store_exists(
                owner,
                fungible_asset::transfer_ref_metadata(transfer_ref)
            );
        fungible_asset::deposit_with_ref(transfer_ref, from_primary_store, fa);

        // create cosmos side account
        if (!account::exists_at(owner)) {
            let _acc_num = account::create_account(owner);
        };
    }

    /// Transfer `amount` of FA from the primary store of `from` to that of `to` ignoring frozen flag.
    public fun transfer_with_ref(
        transfer_ref: &TransferRef,
        from: address,
        to: address,
        amount: u64
    ) acquires DeriveRefPod, ModuleStore {
        let from_primary_store =
            primary_store(
                from,
                fungible_asset::transfer_ref_metadata(transfer_ref)
            );
        let to_primary_store =
            ensure_primary_store_exists(
                to,
                fungible_asset::transfer_ref_metadata(transfer_ref)
            );
        fungible_asset::transfer_with_ref(
            transfer_ref,
            from_primary_store,
            to_primary_store,
            amount
        );

        // create cosmos side account
        if (!account::exists_at(to)) {
            let _acc_num = account::create_account(to);
        };
    }

    #[test_only]
    use initia_std::fungible_asset::{
        create_test_token,
        generate_mint_ref,
        generate_burn_ref,
        generate_transfer_ref
    };
    #[test_only]
    use std::string;

    #[test_only]
    public fun init_module_for_test() {
        if (exists<ModuleStore>(@initia_std)) { return };

        init_module(&account::create_signer_for_test(@initia_std));
    }

    #[test_only]
    public fun init_test_metadata_with_primary_store_enabled(
        constructor_ref: &ConstructorRef
    ): (MintRef, TransferRef, BurnRef) acquires ModuleStore {
        init_module_for_test();
        create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::some(100), // max supply
            string::utf8(b"TEST COIN"),
            string::utf8(b"@T"),
            0,
            string::utf8(b"http://example.com/icon"),
            string::utf8(b"http://example.com")
        );
        let mint_ref = generate_mint_ref(constructor_ref);
        let burn_ref = generate_burn_ref(constructor_ref);
        let transfer_ref = generate_transfer_ref(constructor_ref);
        (mint_ref, transfer_ref, burn_ref)
    }

    #[test(creator = @0xcafe, aaron = @0xface)]
    fun test_default_behavior(creator: &signer, aaron: &signer) acquires DeriveRefPod, ModuleStore {
        let (creator_ref, metadata) = create_test_token(creator);
        init_test_metadata_with_primary_store_enabled(&creator_ref);
        let creator_address = signer::address_of(creator);
        let aaron_address = signer::address_of(aaron);
        assert!(
            !primary_store_exists(creator_address, metadata),
            1
        );
        assert!(
            !primary_store_exists(aaron_address, metadata),
            2
        );
        assert!(balance(creator_address, metadata) == 0, 3);
        assert!(balance(aaron_address, metadata) == 0, 4);
        assert!(!is_frozen(creator_address, metadata), 5);
        assert!(!is_frozen(aaron_address, metadata), 6);
        ensure_primary_store_exists(creator_address, metadata);
        ensure_primary_store_exists(aaron_address, metadata);
        assert!(
            primary_store_exists(creator_address, metadata),
            7
        );
        assert!(
            primary_store_exists(aaron_address, metadata),
            8
        );
    }

    #[test(creator = @0xcafe, aaron = @0xface)]
    fun test_basic_flow(creator: &signer, aaron: &signer) acquires DeriveRefPod, ModuleStore {
        let (creator_ref, metadata) = create_test_token(creator);
        let (mint_ref, transfer_ref, burn_ref) =
            init_test_metadata_with_primary_store_enabled(&creator_ref);
        let creator_address = signer::address_of(creator);
        let aaron_address = signer::address_of(aaron);
        assert!(balance(creator_address, metadata) == 0, 1);
        assert!(balance(aaron_address, metadata) == 0, 2);
        mint(&mint_ref, creator_address, 100);
        transfer(creator, metadata, aaron_address, 80);
        let fa = withdraw(aaron, metadata, 10);
        deposit(creator_address, fa);
        assert!(balance(creator_address, metadata) == 30, 3);
        assert!(balance(aaron_address, metadata) == 70, 4);
        set_frozen_flag(&transfer_ref, aaron_address, true);
        assert!(is_frozen(aaron_address, metadata), 5);
        let fa = withdraw_with_ref(&transfer_ref, aaron_address, 30);
        deposit_with_ref(&transfer_ref, aaron_address, fa);
        transfer_with_ref(
            &transfer_ref,
            aaron_address,
            creator_address,
            20
        );
        set_frozen_flag(&transfer_ref, aaron_address, false);
        assert!(!is_frozen(aaron_address, metadata), 6);
        burn(&burn_ref, aaron_address, 50);
        assert!(balance(aaron_address, metadata) == 0, 7);
    }
}
