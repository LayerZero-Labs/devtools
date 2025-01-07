/// This defines a minimally viable nft for no-code solutions akin the the original nft at
/// initia_std::nft module.
/// IBC transfer will only support nft that is created by initia_nft
/// The key features are:
/// * Base nft and collection features
/// * Only owner can burn or no one can burn nft
/// * Only support object's ungated transfer
/// * Freeze is not available
/// * Standard object-based transfer and events
module initia_std::initia_nft {
    use std::error;
    use std::option::{Self, Option};
    use std::string::String;
    use std::signer;
    use initia_std::object::{Self, ConstructorRef, ExtendRef, Object};
    use initia_std::collection::{Self, Collection};
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
    /// The provided signer is not the owner
    const ENOT_OWNER: u64 = 5;
    /// The NFT is not allowed to burn
    const ECAN_NOT_BURN: u64 = 6;

    /// Storage state for managing the no-code Collection.
    struct InitiaNftCollection has key {
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
        /// Determines if the creator can mutate nft uris
        mutable_nft_uri: bool
    }

    /// Storage state for managing the no-code Nft.
    struct InitiaNft has key {
        /// Used to burn.
        burn_ref: Option<nft::BurnRef>,
        /// Used to mutate fields
        mutator_ref: Option<nft::MutatorRef>
    }

    /// Create a new collection
    public entry fun create_collection(
        creator: &signer,
        description: String,
        max_supply: Option<u64>,
        name: String,
        uri: String,
        mutable_description: bool,
        mutable_royalty: bool,
        mutable_uri: bool,
        mutable_nft_description: bool,
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
            mutable_nft_uri,
            royalty
        );
    }

    public fun create_collection_object(
        creator: &signer,
        description: String,
        max_supply: Option<u64>,
        name: String,
        uri: String,
        mutable_description: bool,
        mutable_royalty: bool,
        mutable_uri: bool,
        mutable_nft_description: bool,
        mutable_nft_uri: bool,
        royalty: BigDecimal
    ): (Object<InitiaNftCollection>, ExtendRef) {
        let creator_addr = signer::address_of(creator);
        let royalty = royalty::create(royalty, creator_addr);
        let constructor_ref =
            if (option::is_some(&max_supply)) {
                collection::create_fixed_collection(
                    creator,
                    description,
                    option::extract(&mut max_supply),
                    name,
                    option::some(royalty),
                    uri
                )
            } else {
                collection::create_unlimited_collection(
                    creator,
                    description,
                    name,
                    option::some(royalty),
                    uri
                )
            };

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

        let extend_ref = object::generate_extend_ref(&constructor_ref);

        let initia_nft_collection = InitiaNftCollection {
            mutator_ref,
            royalty_mutator_ref,
            mutable_description,
            mutable_uri,
            mutable_nft_description,
            mutable_nft_uri
        };
        move_to(&object_signer, initia_nft_collection);
        (object::object_from_constructor_ref(&constructor_ref), extend_ref)
    }

    /// With an existing collection, directly mint a viable nft into the creators account.
    public entry fun mint(
        creator: &signer,
        collection: String,
        description: String,
        token_id: String,
        uri: String,
        can_burn: bool,
        to: Option<address>
    ) acquires InitiaNftCollection {
        let (nft_object, _) =
            mint_nft_object(
                creator,
                collection,
                description,
                token_id,
                uri,
                can_burn
            );
        if (option::is_some(&to)) {
            object::transfer(creator, nft_object, option::extract(&mut to));
        }
    }

    /// Mint a nft into an existing collection, and retrieve the object / address of the nft.
    public fun mint_nft_object(
        creator: &signer,
        collection: String,
        description: String,
        token_id: String,
        uri: String,
        can_burn: bool
    ): (Object<InitiaNft>, ExtendRef) acquires InitiaNftCollection {
        let constructor_ref =
            mint_internal(
                creator,
                collection,
                description,
                token_id,
                uri,
                can_burn
            );
        let extend_ref = object::generate_extend_ref(&constructor_ref);

        (object::object_from_constructor_ref(&constructor_ref), extend_ref)
    }

    fun mint_internal(
        creator: &signer,
        collection_name: String,
        description: String,
        token_id: String,
        uri: String,
        can_burn: bool
    ): ConstructorRef acquires InitiaNftCollection {
        let collection_obj = collection_object(creator, &collection_name);
        let constructor_ref =
            nft::create(
                creator,
                object::convert<InitiaNftCollection, Collection>(collection_obj),
                description,
                token_id,
                option::none(),
                uri
            );

        let object_signer = object::generate_signer(&constructor_ref);
        let collection = borrow_collection(collection_obj);

        let mutator_ref =
            if (collection.mutable_nft_description || collection.mutable_nft_uri) {
                option::some(nft::generate_mutator_ref(&constructor_ref))
            } else {
                option::none()
            };

        let burn_ref =
            if (can_burn) {
                option::some(nft::generate_burn_ref(&constructor_ref))
            } else {
                option::none()
            };

        let initia_nft = InitiaNft { burn_ref, mutator_ref };
        move_to(&object_signer, initia_nft);

        constructor_ref
    }

    // Nft accessors

    inline fun borrow<T: key>(nft: Object<T>): &InitiaNft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<InitiaNft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        borrow_global<InitiaNft>(nft_address)
    }

    #[view]
    public fun is_mutable_description<T: key>(nft: Object<T>): bool acquires InitiaNftCollection {
        is_mutable_collection_nft_description(nft::collection_object(nft))
    }

    #[view]
    public fun is_mutable_uri<T: key>(nft: Object<T>): bool acquires InitiaNftCollection {
        is_mutable_collection_nft_uri(nft::collection_object(nft))
    }

    // Nft mutators

    inline fun authorized_borrow<T: key>(nft: Object<T>, creator: &signer): &InitiaNft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<InitiaNft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );

        assert!(
            nft::creator(nft) == signer::address_of(creator),
            error::permission_denied(ENOT_CREATOR)
        );
        borrow_global<InitiaNft>(nft_address)
    }

    public entry fun burn<T: key>(owner: &signer, nft: Object<T>) acquires InitiaNft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<InitiaNft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        assert!(
            object::owns(nft, signer::address_of(owner)),
            error::permission_denied(ENOT_OWNER)
        );

        let initia_nft = move_from<InitiaNft>(object::object_address(&nft));
        assert!(
            option::is_some(&initia_nft.burn_ref),
            error::invalid_state(ECAN_NOT_BURN)
        );
        let InitiaNft { burn_ref, mutator_ref: _ } = initia_nft;
        nft::burn(option::extract(&mut burn_ref));
    }

    public entry fun set_description<T: key>(
        creator: &signer, nft: Object<T>, description: String
    ) acquires InitiaNftCollection, InitiaNft {
        assert!(
            is_mutable_description(nft),
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        let initia_nft = authorized_borrow(nft, creator);
        nft::set_description(
            option::borrow(&initia_nft.mutator_ref),
            description
        );
    }

    public entry fun set_uri<T: key>(
        creator: &signer, nft: Object<T>, uri: String
    ) acquires InitiaNftCollection, InitiaNft {
        assert!(
            is_mutable_uri(nft),
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        let initia_nft = authorized_borrow(nft, creator);
        nft::set_uri(option::borrow(&initia_nft.mutator_ref), uri);
    }

    // Collection accessors

    inline fun collection_object(creator: &signer, name: &String): Object<InitiaNftCollection> {
        let collection_addr =
            collection::create_collection_address(signer::address_of(creator), name);
        object::address_to_object<InitiaNftCollection>(collection_addr)
    }

    inline fun borrow_collection<T: key>(nft: Object<T>): &InitiaNftCollection {
        let collection_address = object::object_address(&nft);
        assert!(
            exists<InitiaNftCollection>(collection_address),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
        borrow_global<InitiaNftCollection>(collection_address)
    }

    public fun is_mutable_collection_description<T: key>(
        collection: Object<T>
    ): bool acquires InitiaNftCollection {
        borrow_collection(collection).mutable_description
    }

    public fun is_mutable_collection_royalty<T: key>(
        collection: Object<T>
    ): bool acquires InitiaNftCollection {
        option::is_some(&borrow_collection(collection).royalty_mutator_ref)
    }

    public fun is_mutable_collection_uri<T: key>(
        collection: Object<T>
    ): bool acquires InitiaNftCollection {
        borrow_collection(collection).mutable_uri
    }

    public fun is_mutable_collection_nft_description<T: key>(
        collection: Object<T>
    ): bool acquires InitiaNftCollection {
        borrow_collection(collection).mutable_nft_description
    }

    public fun is_mutable_collection_nft_uri<T: key>(
        collection: Object<T>
    ): bool acquires InitiaNftCollection {
        borrow_collection(collection).mutable_nft_uri
    }

    // Collection mutators

    inline fun authorized_borrow_collection<T: key>(
        collection: Object<T>, creator: &signer
    ): &InitiaNftCollection {
        let collection_address = object::object_address(&collection);
        assert!(
            exists<InitiaNftCollection>(collection_address),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
        assert!(
            collection::creator(collection) == signer::address_of(creator),
            error::permission_denied(ENOT_CREATOR)
        );
        borrow_global<InitiaNftCollection>(collection_address)
    }

    public entry fun set_collection_description<T: key>(
        creator: &signer, collection: Object<T>, description: String
    ) acquires InitiaNftCollection {
        let initia_nft_collection = authorized_borrow_collection(collection, creator);
        assert!(
            initia_nft_collection.mutable_description,
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        collection::set_description(
            option::borrow(&initia_nft_collection.mutator_ref),
            description
        );
    }

    public fun set_collection_royalties<T: key>(
        creator: &signer, collection: Object<T>, royalty: royalty::Royalty
    ) acquires InitiaNftCollection {
        let initia_nft_collection = authorized_borrow_collection(collection, creator);
        assert!(
            option::is_some(&initia_nft_collection.royalty_mutator_ref),
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        royalty::update(
            option::borrow(&initia_nft_collection.royalty_mutator_ref),
            royalty
        );
    }

    public fun set_collection_royalties_call<T: key>(
        creator: &signer,
        collection: Object<T>,
        royalty: BigDecimal,
        payee_address: address
    ) acquires InitiaNftCollection {
        let royalty = royalty::create(royalty, payee_address);
        set_collection_royalties(creator, collection, royalty);
    }

    public entry fun set_collection_uri<T: key>(
        creator: &signer, collection: Object<T>, uri: String
    ) acquires InitiaNftCollection {
        let initia_nft_collection = authorized_borrow_collection(collection, creator);
        assert!(
            initia_nft_collection.mutable_uri,
            error::permission_denied(EFIELD_NOT_MUTABLE)
        );
        collection::set_uri(
            option::borrow(&initia_nft_collection.mutator_ref),
            uri
        );
    }

    // Tests

    #[test_only]
    use std::string;

    #[test_only]
    use initia_std::bigdecimal;

    #[test(creator = @0x123)]
    fun test_create_and_transfer(creator: &signer) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

        assert!(
            object::owner(nft) == signer::address_of(creator),
            1
        );
        object::transfer(creator, nft, @0x345);
        assert!(object::owner(nft) == @0x345, 1);
    }

    #[test(creator = @0x123)]
    fun test_set_description(creator: &signer) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

        let description = string::utf8(b"not");
        assert!(nft::description(nft) != description, 0);
        set_description(creator, nft, description);
        assert!(nft::description(nft) == description, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_description(creator: &signer) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, false);
        let nft = mint_helper(creator, collection_name, token_id);

        set_description(creator, nft, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_description_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

        let description = string::utf8(b"not");
        set_description(noncreator, nft, description);
    }

    #[test(creator = @0x123)]
    fun test_set_uri(creator: &signer) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

        let uri = string::utf8(b"not");
        assert!(nft::uri(nft) != uri, 0);
        set_uri(creator, nft, uri);
        assert!(nft::uri(nft) == uri, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_uri(creator: &signer) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, false);
        let nft = mint_helper(creator, collection_name, token_id);

        set_uri(creator, nft, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_uri_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

        let uri = string::utf8(b"not");
        set_uri(noncreator, nft, uri);
    }

    #[test(creator = @0x123)]
    fun test_burnable(creator: &signer) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);
        let nft_addr = object::object_address(&nft);

        assert!(exists<InitiaNft>(nft_addr), 0);
        burn(creator, nft);
        assert!(!exists<InitiaNft>(nft_addr), 1);
    }

    #[test(creator = @0x123, nonowner = @0x456)]
    #[expected_failure(abort_code = 0x50005, location = Self)]
    fun test_burn_non_owner(
        creator: &signer, nonowner: &signer
    ) acquires InitiaNftCollection, InitiaNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

        burn(nonowner, nft);
    }

    #[test(creator = @0x123)]
    fun test_set_collection_description(creator: &signer) acquires InitiaNftCollection {
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
    fun test_set_immutable_collection_description(creator: &signer) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, false);
        set_collection_description(creator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_collection_description_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        set_collection_description(noncreator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123)]
    fun test_set_collection_uri(creator: &signer) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        let value = string::utf8(b"not");
        assert!(collection::uri(collection) != value, 0);
        set_collection_uri(creator, collection, value);
        assert!(collection::uri(collection) == value, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_set_immutable_collection_uri(creator: &signer) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, false);
        set_collection_uri(creator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123, noncreator = @0x456)]
    #[expected_failure(abort_code = 0x50003, location = Self)]
    fun test_set_collection_uri_non_creator(
        creator: &signer, noncreator: &signer
    ) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let collection = create_collection_helper(creator, collection_name, true);
        set_collection_uri(noncreator, collection, string::utf8(b""));
    }

    #[test(creator = @0x123)]
    fun test_royalties(creator: &signer) acquires InitiaNftCollection {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");

        let collection = create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);

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
    ): Object<InitiaNftCollection> {
        let (obj, _) =
            create_collection_object(
                creator,
                string::utf8(b"collection description"),
                option::some(1),
                collection_name,
                string::utf8(b"collection uri"),
                flag,
                flag,
                flag,
                flag,
                flag,
                bigdecimal::from_ratio_u64(1, 100)
            );

        obj
    }

    #[test_only]
    fun mint_helper(
        creator: &signer, collection_name: String, token_id: String
    ): Object<InitiaNft> acquires InitiaNftCollection {
        let (obj, _) =
            mint_nft_object(
                creator,
                collection_name,
                string::utf8(b"description"),
                token_id,
                string::utf8(b"uri"),
                true
            );

        obj
    }
}
