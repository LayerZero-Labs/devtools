/// This defines an object-based Collection. A collection acts as a set organizer for a group of
/// nfts. This includes aspects such as a general description, project URI, name, and may contain
/// other useful generalizations across this set of nfts.
///
/// Being built upon objects enables collections to be relatively flexible. As core primitives it
/// supports:
/// * Common fields: name, uri, description, creator
/// * MutatorRef leaving mutability configuration to a higher level component
/// * Addressed by a global identifier of creator's address and collection name, thus collections
///   cannot be deleted as a restriction of the object model.
/// * Optional support for collection-wide royalties
/// * Optional support for tracking of supply with events on mint or burn
///
/// TODO:
/// * Consider supporting changing the name of the collection with the MutatorRef. This would
///   require adding the field original_name.
/// * Consider supporting changing the aspects of supply with the MutatorRef.
/// * Add aggregator support when added to framework
module initia_std::collection {
    use std::error;
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::bcs;
    use initia_std::event;
    use initia_std::object::{Self, ConstructorRef, Object};
    use initia_std::table::{Self, Table};
    use initia_std::hex;

    use initia_std::royalty::{Self, Royalty};

    friend initia_std::nft;

    /// The collection does not exist
    const ECOLLECTION_DOES_NOT_EXIST: u64 = 1;
    /// The collection has reached its supply and no more nfts can be minted, unless some are burned
    const ECOLLECTION_SUPPLY_EXCEEDED: u64 = 2;
    /// The collection name is over the maximum length
    const ECOLLECTION_NAME_TOO_LONG: u64 = 3;
    /// The URI is over the maximum length
    const EURI_TOO_LONG: u64 = 4;
    /// The description is over the maximum length
    const EDESCRIPTION_TOO_LONG: u64 = 5;
    /// The max supply must be positive
    const EMAX_SUPPLY_CANNOT_BE_ZERO: u64 = 6;
    /// The collection name is invalid
    const EINVALID_COLLECTION_NAME: u64 = 7;

    const MAX_COLLECTION_NAME_LENGTH: u64 = 128;
    const MAX_URI_LENGTH: u64 = 512;
    const MAX_DESCRIPTION_LENGTH: u64 = 2048;
    const MAX_QUERY_LIMIT: u64 = 30;

    /// Represents the common fields for a collection.
    struct Collection has key {
        /// The creator of this collection.
        creator: address,
        /// A brief description of the collection.
        description: String,
        /// An optional categorization of similar nft.
        name: String,
        /// The Uniform Resource Identifier (uri) pointing to the JSON file stored in off-chain
        /// storage; the URL length will likely need a maximum any suggestions?
        uri: String,
        /// index to object map.
        nfts: Table<String, address>
    }

    /// This enables mutating description and URI by higher level services.
    struct MutatorRef has drop, store {
        self: address
    }

    #[event]
    /// Contains the mutated fields name. This makes the life of indexers easier, so that they can
    /// directly understand the behavior in a writeset.
    struct MutationEvent has drop, store {
        collection: address,
        mutated_field_name: String,
        old_value: String,
        new_value: String
    }

    /// Fixed supply tracker, this is useful for ensuring that a limited number of nfts are minted.
    /// and adding events and supply tracking to a collection.
    struct FixedSupply has key {
        /// Total minted - total burned
        current_supply: u64,
        max_supply: u64,
        total_minted: u64
    }

    /// Unlimited supply tracker, this is useful for adding events and supply tracking to a collection.
    struct UnlimitedSupply has key {
        current_supply: u64,
        total_minted: u64
    }

    struct NftResponse has drop {
        token_id: String,
        nft: address
    }

    #[event]
    struct CreateCollectionEvent has drop, store {
        collection: address,
        creator: address,
        name: String
    }

    #[event]
    struct BurnEvent has drop, store {
        collection: address,
        token_id: String,
        nft: address
    }

    #[event]
    struct MintEvent has drop, store {
        collection: address,
        token_id: String,
        nft: address
    }

    /// Creates a fixed-sized collection, or a collection that supports a fixed amount of nfts.
    /// This is useful to create a guaranteed, limited supply on-chain digital asset. For example,
    /// a collection 1111 vicious vipers. Note, creating restrictions such as upward limits results
    /// in data structures that prevent Aptos from parallelizing mints of this collection type.
    /// Beyond that, it adds supply tracking with events.
    public fun create_fixed_collection(
        creator: &signer,
        description: String,
        max_supply: u64,
        name: String,
        royalty: Option<Royalty>,
        uri: String
    ): ConstructorRef {
        assert!(
            max_supply != 0,
            error::invalid_argument(EMAX_SUPPLY_CANNOT_BE_ZERO)
        );
        let collection_seed = create_collection_seed(&name);
        let constructor_ref = object::create_named_object(creator, collection_seed);

        let supply = FixedSupply { current_supply: 0, max_supply, total_minted: 0 };

        create_collection_internal(
            creator,
            constructor_ref,
            description,
            name,
            royalty,
            uri,
            option::some(supply)
        )
    }

    /// Creates an unlimited collection. This has support for supply tracking but does not limit
    /// the supply of nfts.
    public fun create_unlimited_collection(
        creator: &signer,
        description: String,
        name: String,
        royalty: Option<Royalty>,
        uri: String
    ): ConstructorRef {
        let collection_seed = create_collection_seed(&name);
        let constructor_ref = object::create_named_object(creator, collection_seed);

        let supply = UnlimitedSupply { current_supply: 0, total_minted: 0 };

        create_collection_internal(
            creator,
            constructor_ref,
            description,
            name,
            royalty,
            uri,
            option::some(supply)
        )
    }

    /// Creates an untracked collection, or a collection that supports an arbitrary amount of
    /// nfts. This is useful for mass airdrops that fully leverage Aptos parallelization.
    /// TODO: Hide this until we bring back meaningful way to enforce burns
    fun create_untracked_collection(
        creator: &signer,
        description: String,
        name: String,
        royalty: Option<Royalty>,
        uri: String
    ): ConstructorRef {
        let collection_seed = create_collection_seed(&name);
        let constructor_ref = object::create_named_object(creator, collection_seed);

        create_collection_internal<FixedSupply>(
            creator,
            constructor_ref,
            description,
            name,
            royalty,
            uri,
            option::none()
        )
    }

    fun assert_collection_name(name: &String) {
        let len = string::length(name);
        assert!(
            len <= MAX_COLLECTION_NAME_LENGTH,
            error::out_of_range(ECOLLECTION_NAME_TOO_LONG)
        );
        assert!(
            string::index_of(name, &string::utf8(b":")) == len,
            error::invalid_argument(EINVALID_COLLECTION_NAME)
        );
    }

    inline fun create_collection_internal<Supply: key>(
        creator: &signer,
        constructor_ref: ConstructorRef,
        description: String,
        name: String,
        royalty: Option<Royalty>,
        uri: String,
        supply: Option<Supply>
    ): ConstructorRef {
        assert_collection_name(&name);

        assert!(
            string::length(&uri) <= MAX_URI_LENGTH,
            error::out_of_range(EURI_TOO_LONG)
        );
        assert!(
            string::length(&description) <= MAX_DESCRIPTION_LENGTH,
            error::out_of_range(EDESCRIPTION_TOO_LONG)
        );

        let object_signer = &object::generate_signer(&constructor_ref);
        let creator_addr = signer::address_of(creator);

        let collection = Collection {
            creator: creator_addr,
            description,
            name,
            uri,
            nfts: table::new()
        };
        move_to(object_signer, collection);

        if (option::is_some(&supply)) {
            move_to(object_signer, option::destroy_some(supply));
            let collection_addr = signer::address_of(object_signer);
            event::emit(
                CreateCollectionEvent {
                    collection: collection_addr,
                    creator: creator_addr,
                    name
                }
            );
        } else {
            option::destroy_none(supply)
        };

        if (option::is_some(&royalty)) {
            royalty::init(
                &constructor_ref,
                option::extract(&mut royalty)
            )
        };

        constructor_ref
    }

    /// Generates the collections address based upon the creators address and the collection's name
    public fun create_collection_address(creator: address, name: &String): address {
        object::create_object_address(&creator, create_collection_seed(name))
    }

    /// Named objects are derived from a seed, the collection's seed is its name.
    public fun create_collection_seed(name: &String): vector<u8> {
        assert!(
            string::length(name) <= MAX_COLLECTION_NAME_LENGTH,
            error::out_of_range(ECOLLECTION_NAME_TOO_LONG)
        );
        *string::bytes(name)
    }

    /// Called by nft on mint to increment supply if there's an appropriate Supply struct.
    public(friend) fun increment_supply(
        collection: Object<Collection>, token_id: String, nft: address
    ) acquires Collection, FixedSupply, UnlimitedSupply {
        let collection_addr = object::object_address(&collection);
        let collection = borrow_global_mut<Collection>(collection_addr);
        if (exists<FixedSupply>(collection_addr)) {
            let supply = borrow_global_mut<FixedSupply>(collection_addr);
            supply.current_supply = supply.current_supply + 1;
            supply.total_minted = supply.total_minted + 1;
            assert!(
                supply.current_supply <= supply.max_supply,
                error::out_of_range(ECOLLECTION_SUPPLY_EXCEEDED)
            );
            table::add(&mut collection.nfts, token_id, nft);
            event::emit(MintEvent { collection: collection_addr, token_id, nft });
        } else if (exists<UnlimitedSupply>(collection_addr)) {
            let supply = borrow_global_mut<UnlimitedSupply>(collection_addr);
            supply.current_supply = supply.current_supply + 1;
            supply.total_minted = supply.total_minted + 1;
            table::add(&mut collection.nfts, token_id, nft);
            event::emit(MintEvent { collection: collection_addr, token_id, nft });
        }
    }

    /// Called by nft on burn to decrement supply if there's an appropriate Supply struct.
    public(friend) fun decrement_supply(
        collection: Object<Collection>, token_id: String, nft: address
    ) acquires Collection, FixedSupply, UnlimitedSupply {
        let collection_addr = object::object_address(&collection);
        let collection = borrow_global_mut<Collection>(collection_addr);
        if (exists<FixedSupply>(collection_addr)) {
            let supply = borrow_global_mut<FixedSupply>(collection_addr);
            supply.current_supply = supply.current_supply - 1;
            table::remove(&mut collection.nfts, token_id);
            event::emit(BurnEvent { collection: collection_addr, token_id, nft });
        } else if (exists<UnlimitedSupply>(collection_addr)) {
            let supply = borrow_global_mut<UnlimitedSupply>(collection_addr);
            supply.current_supply = supply.current_supply - 1;
            table::remove(&mut collection.nfts, token_id);
            event::emit(BurnEvent { collection: collection_addr, token_id, nft });
        }
    }

    /// Creates a MutatorRef, which gates the ability to mutate any fields that support mutation.
    public fun generate_mutator_ref(ref: &ConstructorRef): MutatorRef {
        let object = object::object_from_constructor_ref<Collection>(ref);
        MutatorRef { self: object::object_address(&object) }
    }

    // Accessors

    inline fun check_collection_exists(addr: address) {
        assert!(
            exists<Collection>(addr),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
    }

    inline fun borrow<T: key>(collection: Object<T>): &Collection {
        let collection_address = object::object_address(&collection);
        check_collection_exists(collection_address);
        borrow_global<Collection>(collection_address)
    }

    #[view]
    /// Provides the count of the current selection if supply tracking is used
    public fun count<T: key>(collection: Object<T>): Option<u64> acquires FixedSupply, UnlimitedSupply {
        let collection_address = object::object_address(&collection);
        check_collection_exists(collection_address);

        if (exists<FixedSupply>(collection_address)) {
            let supply = borrow_global_mut<FixedSupply>(collection_address);
            option::some(supply.current_supply)
        } else if (exists<UnlimitedSupply>(collection_address)) {
            let supply = borrow_global_mut<UnlimitedSupply>(collection_address);
            option::some(supply.current_supply)
        } else {
            option::none()
        }
    }

    #[view]
    public fun creator<T: key>(collection: Object<T>): address acquires Collection {
        borrow(collection).creator
    }

    #[view]
    public fun description<T: key>(collection: Object<T>): String acquires Collection {
        borrow(collection).description
    }

    #[view]
    public fun name<T: key>(collection: Object<T>): String acquires Collection {
        borrow(collection).name
    }

    #[view]
    public fun uri<T: key>(collection: Object<T>): String acquires Collection {
        borrow(collection).uri
    }

    #[view]
    public fun collection_to_class_id<T: key>(collection: Object<T>): String acquires Collection {
        let col = borrow(collection);
        if (col.creator == @initia_std) {
            return col.name
        };

        let metadata_addr = object::object_address(&collection);
        let denom = string::utf8(b"move/");
        let addr_bytes = bcs::to_bytes(&metadata_addr);
        let addr_string = hex::encode_to_string(&addr_bytes);
        string::append(&mut denom, addr_string);
        return denom
    }

    #[view]
    /// get nft list from collection
    /// if `start_after` is not none, search nfts in range (start_after, ...]
    public fun nfts<T: key>(
        collection: Object<T>, start_after: Option<String>, limit: u64
    ): vector<NftResponse> acquires Collection {
        let collection = borrow(collection);

        if (limit > MAX_QUERY_LIMIT) {
            limit = MAX_QUERY_LIMIT;
        };

        let nfts_iter = table::iter(
            &collection.nfts,
            option::none(),
            start_after,
            2
        );

        let res: vector<NftResponse> = vector[];

        while (table::prepare<String, address>(nfts_iter)
            && vector::length(&res) < (limit as u64)) {
            let (token_id, nft) = table::next<String, address>(nfts_iter);

            vector::push_back(&mut res, NftResponse { token_id, nft: *nft });
        };

        res
    }

    public fun decompose_nft_response(nft_response: &NftResponse): (String, address) {
        (nft_response.token_id, nft_response.nft)
    }

    // Mutators

    inline fun borrow_mut(mutator_ref: &MutatorRef): &mut Collection {
        check_collection_exists(mutator_ref.self);
        borrow_global_mut<Collection>(mutator_ref.self)
    }

    public fun set_description(
        mutator_ref: &MutatorRef, description: String
    ) acquires Collection {
        assert!(
            string::length(&description) <= MAX_DESCRIPTION_LENGTH,
            error::out_of_range(EDESCRIPTION_TOO_LONG)
        );
        let collection = borrow_mut(mutator_ref);
        event::emit(
            MutationEvent {
                collection: mutator_ref.self,
                mutated_field_name: string::utf8(b"description"),
                old_value: collection.description,
                new_value: description
            }
        );
        collection.description = description;
    }

    public fun set_uri(mutator_ref: &MutatorRef, uri: String) acquires Collection {
        assert!(
            string::length(&uri) <= MAX_URI_LENGTH,
            error::out_of_range(EURI_TOO_LONG)
        );
        let collection = borrow_mut(mutator_ref);
        event::emit(
            MutationEvent {
                collection: mutator_ref.self,
                mutated_field_name: string::utf8(b"uri"),
                old_value: collection.uri,
                new_value: uri
            }
        );
        collection.uri = uri;
    }

    // Tests

    #[test(creator = @0x123)]
    fun test_create_mint_burn_for_unlimited(
        creator: &signer
    ) acquires Collection, FixedSupply, UnlimitedSupply {
        let creator_address = signer::address_of(creator);
        let name = string::utf8(b"collection name");
        create_unlimited_collection(
            creator,
            string::utf8(b""),
            name,
            option::none(),
            string::utf8(b"")
        );
        let collection_address = create_collection_address(creator_address, &name);
        let collection = object::address_to_object<Collection>(collection_address);
        assert!(count(collection) == option::some(0), 0);
        increment_supply(
            collection,
            string::utf8(b"token_id"),
            @0x11111
        );
        assert!(count(collection) == option::some(1), 0);
        decrement_supply(
            collection,
            string::utf8(b"token_id"),
            @0x11112
        );
        assert!(count(collection) == option::some(0), 0);
    }

    #[test(creator = @0x123)]
    fun test_create_mint_burn_for_fixed(
        creator: &signer
    ) acquires Collection, FixedSupply, UnlimitedSupply {
        let creator_address = signer::address_of(creator);
        let name = string::utf8(b"collection name");
        create_fixed_collection(
            creator,
            string::utf8(b""),
            1,
            name,
            option::none(),
            string::utf8(b"")
        );
        let collection_address = create_collection_address(creator_address, &name);
        let collection = object::address_to_object<Collection>(collection_address);
        assert!(count(collection) == option::some(0), 0);
        increment_supply(
            collection,
            string::utf8(b"token_id"),
            @0x11111
        );
        assert!(count(collection) == option::some(1), 0);
        decrement_supply(
            collection,
            string::utf8(b"token_id"),
            @0x11112
        );
        assert!(count(collection) == option::some(0), 0);
    }

    #[test(creator = @0x123, recipient = @0x456)]
    entry fun test_create_and_transfer(
        creator: &signer, recipient: &signer
    ) {
        let creator_address = signer::address_of(creator);
        let collection_name = string::utf8(b"collection name");
        create_collection_helper(creator, collection_name);

        let collection =
            object::address_to_object<Collection>(
                create_collection_address(creator_address, &collection_name)
            );
        assert!(
            object::owner(collection) == creator_address,
            1
        );
        object::transfer(
            creator,
            collection,
            signer::address_of(recipient)
        );
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x10007, location = Self)]
    fun test_create_collection_with_invalid_name(creator: &signer) {
        create_collection_helper(creator, string::utf8(b"collection::hello"));
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x80001, location = initia_std::object)]
    entry fun test_duplicate_collection(creator: &signer) {
        let collection_name = string::utf8(b"collection name");
        create_collection_helper(creator, collection_name);
        create_collection_helper(creator, collection_name);
    }

    #[test(creator = @0x123)]
    entry fun test_set_description(creator: &signer) acquires Collection {
        let collection_name = string::utf8(b"collection name");
        let constructor_ref = create_collection_helper(creator, collection_name);
        let collection =
            object::address_to_object<Collection>(
                create_collection_address(
                    signer::address_of(creator),
                    &collection_name
                )
            );
        let mutator_ref = generate_mutator_ref(&constructor_ref);
        let description = string::utf8(b"no fail");
        assert!(description != description(collection), 0);
        set_description(&mutator_ref, description);
        assert!(description == description(collection), 1);
    }

    #[test(creator = @0x123)]
    entry fun test_set_uri(creator: &signer) acquires Collection {
        let collection_name = string::utf8(b"collection name");
        let constructor_ref = create_collection_helper(creator, collection_name);
        let mutator_ref = generate_mutator_ref(&constructor_ref);
        let collection =
            object::address_to_object<Collection>(
                create_collection_address(
                    signer::address_of(creator),
                    &collection_name
                )
            );
        let uri = string::utf8(b"no fail");
        assert!(uri != uri(collection), 0);
        set_uri(&mutator_ref, uri);
        assert!(uri == uri(collection), 1);
    }

    #[test(creator = @0x123)]
    fun test_nfts_query(creator: &signer) acquires Collection, FixedSupply, UnlimitedSupply {
        let creator_address = signer::address_of(creator);
        let name = string::utf8(b"collection name");
        create_unlimited_collection(
            creator,
            string::utf8(b""),
            name,
            option::none(),
            string::utf8(b"")
        );
        let collection_address = create_collection_address(creator_address, &name);
        let collection = object::address_to_object<Collection>(collection_address);
        increment_supply(collection, string::utf8(b"1"), @0x001);
        increment_supply(collection, string::utf8(b"2"), @0x002);
        increment_supply(collection, string::utf8(b"3"), @0x003);

        let nfts = nfts(collection, option::none(), 5);
        assert!(
            nfts
                == vector[
                    NftResponse { token_id: string::utf8(b"3"), nft: @0x003 },
                    NftResponse { token_id: string::utf8(b"2"), nft: @0x002 },
                    NftResponse { token_id: string::utf8(b"1"), nft: @0x001 }
                ],
            0
        );

        nfts = nfts(
            collection,
            option::some(string::utf8(b"3")),
            5
        );
        assert!(
            nfts
                == vector[
                    NftResponse { token_id: string::utf8(b"2"), nft: @0x002 },
                    NftResponse { token_id: string::utf8(b"1"), nft: @0x001 }
                ],
            1
        )
    }

    #[test_only]
    fun create_collection_helper(creator: &signer, name: String): ConstructorRef {
        create_untracked_collection(
            creator,
            string::utf8(b"collection description"),
            name,
            option::none(),
            string::utf8(b"collection uri")
        )
    }
}
