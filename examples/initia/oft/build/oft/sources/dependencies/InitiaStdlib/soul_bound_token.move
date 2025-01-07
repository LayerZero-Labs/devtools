/// This defines a soul bound token (SBT) for no-code solutions akin the the original nft at
/// initia_std::nft module.
module initia_std::soul_bound_token {
    use std::error;
    use std::option::{Self, Option};
    use std::string::String;
    use std::signer;
    use initia_std::object::{Self, ConstructorRef, Object};
    use initia_std::collection::{Self, Collection};
    use initia_std::property_map;
    use initia_std::royalty;
    use initia_std::nft;
    use initia_std::bigdecimal::BigDecimal;

    /// The collection does not exist
    const ECOLLECTION_DOES_NOT_EXIST: u64 = 1;
    /// The nft does not exist
    const ENFT_DOES_NOT_EXIST: u64 = 2;
    /// The provided signer is not the creator
    const ENOT_CREATOR: u64 = 3;
    /// The field being changed is not mutable
    const EFIELD_NOT_MUTABLE: u64 = 4;
    /// The property map being mutated is not mutable
    const EPROPERTIES_NOT_MUTABLE: u64 = 5;

    /// Storage state for managing the no-code Collection.
    struct SoulBoundTokenCollection has key {
        /// Used to mutate collection fields
        mutator_ref: Option<collection::MutatorRef>,
        /// Used to mutate royalties
        royalty_mutator_ref: Option<royalty::MutatorRef>,
        /// Determines if the creator can mutate the collection's description
        mutable_description: bool,
        /// Determines if the creator can mutate the collection's uri
        mutable_uri: bool,
        /// Determines if the creator can mutate nft descriptions
        mutable_nft_description: bool,
        /// Determines if the creator can mutate nft names
        mutable_nft_name: bool,
        /// Determines if the creator can mutate nft properties
        mutable_nft_properties: bool,
        /// Determines if the creator can mutate nft uris
        mutable_nft_uri: bool
    }

    /// Storage state for managing the no-code Token.
    struct SoulBoundToken has key {
        /// Used to mutate fields
        mutator_ref: Option<nft::MutatorRef>,
        /// Used to mutate properties
        property_mutator_ref: property_map::MutatorRef
    }

    /// Create a new collection
    public entry fun create_collection(
        creator: &signer,
        description: String,
        max_supply: u64,
        name: String,
        uri: String,
        mutable_description: bool,
        mutable_royalty: bool,
        mutable_uri: bool,
        mutable_nft_description: bool,
        mutable_nft_name: bool,
        mutable_nft_properties: bool,
        mutable_nft_uri: bool,
        royalty: BigDecimal
    ) {
        create_collection_object(
            creator,
            description,
            max_supply,
            name,
            uri,
            mutable_description,
            mutable_royalty,
            mutable_uri,
            mutable_nft_description,
            mutable_nft_name,
            mutable_nft_properties,
            mutable_nft_uri,
            royalty
        );
    }

    public fun create_collection_object(
        creator: &signer,
        description: String,
        max_supply: u64,
        name: String,
        uri: String,
        mutable_description: bool,
        mutable_royalty: bool,
        mutable_uri: bool,
        mutable_nft_description: bool,
        mutable_nft_name: bool,
        mutable_nft_properties: bool,
        mutable_nft_uri: bool,
        royalty: BigDecimal
    ): Object<SoulBoundTokenCollection> {
        let creator_addr = signer::address_of(creator);
        let royalty = royalty::create(royalty, creator_addr);
        let constructor_ref =
            collection::create_fixed_collection(
                creator,
                description,
                max_supply,
                name,
                option::some(royalty),
                uri
            );

        let object_signer = object::generate_signer(&constructor_ref);
        let mutator_ref =
            if (mutable_description || mutable_uri) {
                option::some(collection::generate_mutator_ref(&constructor_ref))
            } else {
                option::none()
            };

        let royalty_mutator_ref =
            if (mutable_royalty) {
                option::some(
                    royalty::generate_mutator_ref(
                        object::generate_extend_ref(&constructor_ref)
                    )
                )
            } else {
                option::none()
            };

        let soul_bound_token_collection = SoulBoundTokenCollection {
            mutator_ref,
            royalty_mutator_ref,
            mutable_description,
            mutable_uri,
            mutable_nft_description,
            mutable_nft_name,
            mutable_nft_properties,
            mutable_nft_uri
        };
        move_to(&object_signer, soul_bound_token_collection);
        object::object_from_constructor_ref(&constructor_ref)
    }

    /// With an existing collection, directly mint a soul bound token into the recipient's account.
    public entry fun mint(
        creator: &signer,
        collection: String,
        description: String,
        name: String,
        uri: String,
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>,
        soul_bound_to: address
    ) acquires SoulBoundTokenCollection {
        mint_soul_bound_token_object(
            creator,
            collection,
            description,
            name,
            uri,
            property_keys,
            property_types,
            property_values,
            soul_bound_to
        );
    }

    /// With an existing collection, directly mint a soul bound token into the recipient's account.
    public fun mint_soul_bound_token_object(
        creator: &signer,
        collection: String,
        description: String,
        name: String,
        uri: String,
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>,
        soul_bound_to: address
    ): Object<SoulBoundToken> acquires SoulBoundTokenCollection {
        let constructor_ref =
            mint_internal(
                creator,
                collection,
                description,
                name,
                uri,
                property_keys,
                property_types,
                property_values
            );

        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        let linear_transfer_ref = object::generate_linear_transfer_ref(&transfer_ref);
        object::transfer_with_ref(linear_transfer_ref, soul_bound_to);
        object::disable_ungated_transfer(&transfer_ref);

        object::object_from_constructor_ref(&constructor_ref)
    }

    fun mint_internal(
        creator: &signer,
        collection_name: String,
        description: String,
        name: String,
        uri: String,
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>
    ): ConstructorRef acquires SoulBoundTokenCollection {
        let collection_obj = collection_object(creator, &collection_name);
        let constructor_ref =
            nft::create(
                creator,
                object::convert<SoulBoundTokenCollection, Collection>(collection_obj),
                description,
                name,
                option::none(),
                uri
            );
        let s = object::generate_signer(&constructor_ref);

        let object_signer = object::generate_signer(&constructor_ref);

        let collection = borrow_collection(collection_obj);

        let mutator_ref =
            if (collection.mutable_nft_description
                || collection.mutable_nft_name
                || collection.mutable_nft_uri) {
                option::some(nft::generate_mutator_ref(&constructor_ref))
            } else {
                option::none()
            };

        let soul_bound_token = SoulBoundToken {
            mutator_ref,
            property_mutator_ref: property_map::generate_mutator_ref(&s)
        };
        move_to(&object_signer, soul_bound_token);

        let properties =
            property_map::prepare_input(
                property_keys,
                property_types,
                property_values
            );
        property_map::init(&s, properties);

        constructor_ref
    }

    // Token accessors

    inline fun borrow<T: key>(nft: Object<T>): &SoulBoundToken {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<SoulBoundToken>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        borrow_global<SoulBoundToken>(nft_address)
    }

    #[view]
    public fun are_properties_mutable<T: key>(nft: Object<T>): bool acquires SoulBoundTokenCollection {
        let collection = nft::collection_object(nft);
        borrow_collection(collection).mutable_nft_properties
    }

    #[view]
    public fun is_mutable_description<T: key>(nft: Object<T>): bool acquires SoulBoundTokenCollection {
        is_mutable_collection_nft_description(nft::collection_object(nft))
    }

    #[view]
    public fun is_mutable_name<T: key>(nft: Object<T>): bool acquires SoulBoundTokenCollection {
        is_mutable_collection_nft_name(nft::collection_object(nft))
    }

    #[view]
    public fun is_mutable_uri<T: key>(nft: Object<T>): bool acquires SoulBoundTokenCollection {
        is_mutable_collection_nft_uri(nft::collection_object(nft))
    }

    // Token mutators

    inline fun authorized_borrow<T: key>(nft: Object<T>, creator: &signer): &SoulBoundToken {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<SoulBoundToken>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );

        assert!(
            nft::creator(nft) == signer::address_of(creator),
            error::permission_denied(ENOT_CREATOR)
        );
        borrow_global<SoulBoundToken>(nft_address)
    }

    public entry fun set_description<T: key>(
        creator: &signer, nft: Object<T>, description: String
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        assert!(
            is_mutable_description(nft),
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        let soul_bound_token = authorized_borrow(nft, creator);
        nft::set_description(
            option::borrow(&soul_bound_token.mutator_ref),
            description
        );
    }

    public entry fun set_uri<T: key>(
        creator: &signer, nft: Object<T>, uri: String
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        assert!(
            is_mutable_uri(nft),
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        let soul_bound_token = authorized_borrow(nft, creator);
        nft::set_uri(
            option::borrow(&soul_bound_token.mutator_ref),
            uri
        );
    }

    public entry fun add_property<T: key>(
        creator: &signer,
        nft: Object<T>,
        key: String,
        type: String,
        value: vector<u8>
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let soul_bound_token = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::add(
            &soul_bound_token.property_mutator_ref,
            key,
            type,
            value
        );
    }

    public entry fun add_typed_property<T: key, V: drop>(
        creator: &signer,
        nft: Object<T>,
        key: String,
        value: V
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let soul_bound_token = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::add_typed(
            &soul_bound_token.property_mutator_ref,
            key,
            value
        );
    }

    public entry fun remove_property<T: key>(
        creator: &signer, nft: Object<T>, key: String
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let soul_bound_token = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::remove(&soul_bound_token.property_mutator_ref, &key);
    }

    public entry fun update_property<T: key>(
        creator: &signer,
        nft: Object<T>,
        key: String,
        type: String,
        value: vector<u8>
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let soul_bound_token = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::update(
            &soul_bound_token.property_mutator_ref,
            &key,
            type,
            value
        );
    }

    public entry fun update_typed_property<T: key, V: drop>(
        creator: &signer,
        nft: Object<T>,
        key: String,
        value: V
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let soul_bound_token = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::update_typed(
            &soul_bound_token.property_mutator_ref,
            &key,
            value
        );
    }

    // Collection accessors

    inline fun collection_object(creator: &signer, name: &String):
        Object<SoulBoundTokenCollection> {
        let collection_addr =
            collection::create_collection_address(signer::address_of(creator), name);
        object::address_to_object<SoulBoundTokenCollection>(collection_addr)
    }

    inline fun borrow_collection<T: key>(nft: Object<T>): &SoulBoundTokenCollection {
        let collection_address = object::object_address(&nft);
        assert!(
            exists<SoulBoundTokenCollection>(collection_address),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
        borrow_global<SoulBoundTokenCollection>(collection_address)
    }

    public fun is_mutable_collection_description<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        borrow_collection(collection).mutable_description
    }

    public fun is_mutable_collection_royalty<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        option::is_some(&borrow_collection(collection).royalty_mutator_ref)
    }

    public fun is_mutable_collection_uri<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        borrow_collection(collection).mutable_uri
    }

    public fun is_mutable_collection_nft_description<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        borrow_collection(collection).mutable_nft_description
    }

    public fun is_mutable_collection_nft_name<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        borrow_collection(collection).mutable_nft_name
    }

    public fun is_mutable_collection_nft_uri<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        borrow_collection(collection).mutable_nft_uri
    }

    public fun is_mutable_collection_nft_properties<T: key>(
        collection: Object<T>
    ): bool acquires SoulBoundTokenCollection {
        borrow_collection(collection).mutable_nft_properties
    }

    // Collection mutators

    inline fun authorized_borrow_collection<T: key>(
        collection: Object<T>, creator: &signer
    ): &SoulBoundTokenCollection {
        let collection_address = object::object_address(&collection);
        assert!(
            exists<SoulBoundTokenCollection>(collection_address),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
        assert!(
            collection::creator(collection) == signer::address_of(creator),
            error::permission_denied(ENOT_CREATOR)
        );
        borrow_global<SoulBoundTokenCollection>(collection_address)
    }

    public entry fun set_collection_description<T: key>(
        creator: &signer, collection: Object<T>, description: String
    ) acquires SoulBoundTokenCollection {
        let soul_bound_token_collection =
            authorized_borrow_collection(collection, creator);
        assert!(
            soul_bound_token_collection.mutable_description,
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        collection::set_description(
            option::borrow(&soul_bound_token_collection.mutator_ref),
            description
        );
    }

    public fun set_collection_royalties<T: key>(
        creator: &signer, collection: Object<T>, royalty: royalty::Royalty
    ) acquires SoulBoundTokenCollection {
        let soul_bound_token_collection =
            authorized_borrow_collection(collection, creator);
        assert!(
            option::is_some(&soul_bound_token_collection.royalty_mutator_ref),
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        royalty::update(
            option::borrow(&soul_bound_token_collection.royalty_mutator_ref),
            royalty
        );
    }

    entry fun set_collection_royalties_call<T: key>(
        creator: &signer,
        collection: Object<T>,
        royalty: BigDecimal,
        payee_address: address
    ) acquires SoulBoundTokenCollection {
        let royalty = royalty::create(royalty, payee_address);
        set_collection_royalties(creator, collection, royalty);
    }

    public entry fun set_collection_uri<T: key>(
        creator: &signer, collection: Object<T>, uri: String
    ) acquires SoulBoundTokenCollection {
        let soul_bound_token_collection =
            authorized_borrow_collection(collection, creator);
        assert!(
            soul_bound_token_collection.mutable_uri,
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        collection::set_uri(
            option::borrow(&soul_bound_token_collection.mutator_ref),
            uri
        );
    }

    // Tests

    #[test_only]
    use std::string;

    #[test_only]
    use initia_std::bigdecimal;

    #[test(creator = @0x123)]
    fun test_set_description(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        let description = string::utf8(b"not");
        assert!(nft::description(nft) != description, 0);
        set_description(creator, nft, description);
        assert!(nft::description(nft) == description, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_description(
        creator: &signer
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, false);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        set_description(creator, nft, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_description_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        let description = string::utf8(b"not");
        set_description(noncreator, nft, description);
    }

    #[test(creator = @0x123)]
    fun test_set_uri(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        let uri = string::utf8(b"not");
        assert!(nft::uri(nft) != uri, 0);
        set_uri(creator, nft, uri);
        assert!(nft::uri(nft) == uri, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_uri(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, false);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        set_uri(creator, nft, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_uri_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        let uri = string::utf8(b"not");
        set_uri(noncreator, nft, uri);
    }

    #[test(creator = @0x123)]
    fun test_set_collection_description(creator: &signer) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        let value = string::utf8(b"not");
        assert!(
            collection::description(collection) != value,
            0
        );
        set_collection_description(creator, collection, value);
        assert!(
            collection::description(collection) == value,
            1
        );
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_collection_description(
        creator: &signer
    ) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, false);
        set_collection_description(creator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_collection_description_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        set_collection_description(noncreator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123)]
    fun test_set_collection_uri(creator: &signer) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        let value = string::utf8(b"not");
        assert!(collection::uri(collection) != value, 0);
        set_collection_uri(creator, collection, value);
        assert!(collection::uri(collection) == value, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_collection_uri(creator: &signer) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, false);
        set_collection_uri(creator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_collection_uri_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        set_collection_uri(noncreator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123)]
    fun test_property_add(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");
        let property_name = string::utf8(b"u8");
        let property_type = string::utf8(b"u8");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);
        add_property(
            creator,
            nft,
            property_name,
            property_type,
            vector[0x08]
        );

        assert!(
            property_map::read_u8(nft, &property_name) == 0x8,
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_property_typed_add(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");
        let property_name = string::utf8(b"u8");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);
        add_typed_property<SoulBoundToken, u8>(creator, nft, property_name, 0x8);

        assert!(
            property_map::read_u8(nft, &property_name) == 0x8,
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_property_update(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");
        let property_name = string::utf8(b"bool");
        let property_type = string::utf8(b"bool");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);
        update_property(
            creator,
            nft,
            property_name,
            property_type,
            vector[0x00]
        );

        assert!(
            !property_map::read_bool(nft, &property_name),
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_property_update_typed(
        creator: &signer
    ) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");
        let property_name = string::utf8(b"bool");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);
        update_typed_property<SoulBoundToken, bool>(creator, nft, property_name, false);

        assert!(
            !property_map::read_bool(nft, &property_name),
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_property_remove(creator: &signer) acquires SoulBoundTokenCollection, SoulBoundToken {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");
        let property_name = string::utf8(b"bool");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);
        remove_property(creator, nft, property_name);
    }

    #[test(creator = @0x123)]
    fun test_royalties(creator: &signer) acquires SoulBoundTokenCollection {
        let collection_name = string::utf8(b"collection name");
        let nft_name = string::utf8(b"nft name");

        let collection = create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, nft_name, @0x123);

        let royalty_before = option::extract(&mut nft::royalty(nft));
        set_collection_royalties_call(
            creator,
            collection,
            bigdecimal::from_ratio_u64(2, 3),
            @0x444
        );
        let royalty_after = option::extract(&mut nft::royalty(nft));
        assert!(royalty_before != royalty_after, 0);
    }

    #[test_only]
    fun create_collection_helper(
        creator: &signer, collection_name: String, flag: bool
    ): Object<SoulBoundTokenCollection> {
        create_collection_object(
            creator,
            string::utf8(b"collection description"),
            1,
            collection_name,
            string::utf8(b"collection uri"),
            flag,
            flag,
            flag,
            flag,
            flag,
            flag,
            flag,
            bigdecimal::from_ratio_u64(1, 100)
        )
    }

    #[test_only]
    fun mint_helper(
        creator: &signer,
        collection_name: String,
        nft_name: String,
        soul_bound_to: address
    ): Object<SoulBoundToken> acquires SoulBoundTokenCollection {
        mint_soul_bound_token_object(
            creator,
            collection_name,
            string::utf8(b"description"),
            nft_name,
            string::utf8(b"uri"),
            vector[string::utf8(b"bool")],
            vector[string::utf8(b"bool")],
            vector[vector[0x01]],
            soul_bound_to
        )
    }
}
