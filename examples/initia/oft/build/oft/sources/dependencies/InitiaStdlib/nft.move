/// This defines an object-based Nft.
/// nft are:
/// * Decoupled nft ownership from nft data.
/// * Explicit data model for nft metadata via adjacent resources
/// * Extensible framework for nfts
///
module initia_std::nft {
    use std::error;
    use std::option::{Self, Option};
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use initia_std::event;
    use initia_std::object::{Self, ConstructorRef, Object};
    use initia_std::collection::{Self, Collection};
    use initia_std::royalty::{Self, Royalty};

    /// The nft does not exist
    const ENFT_DOES_NOT_EXIST: u64 = 1;
    /// The provided signer is not the creator
    const ENOT_CREATOR: u64 = 2;
    /// The field being changed is not mutable
    const EFIELD_NOT_MUTABLE: u64 = 3;
    /// The nft token id is over the maximum length
    const ENFT_TOKEN_ID_TOO_LONG: u64 = 4;
    /// The URI is over the maximum length
    const EURI_TOO_LONG: u64 = 6;
    /// The description is over the maximum length
    const EDESCRIPTION_TOO_LONG: u64 = 7;
    /// The query length is over the maximum length
    const EQUERY_LENGTH_TOO_LONG: u64 = 8;
    /// The provided token id is invalid
    const EINVALID_TOKEN_ID: u64 = 9;
    /// The calling signer is not the owner
    const ENOT_OWNER: u64 = 10;

    const MAX_NFT_TOKEN_ID_LENGTH: u64 = 128;
    const MAX_URI_LENGTH: u64 = 512;
    const MAX_DESCRIPTION_LENGTH: u64 = 2048;
    const MAX_QUERY_LENGTH: u64 = 30;

    /// Represents the common fields to all nfts.
    struct Nft has key {
        /// The collection where this nft resides.
        collection: Object<Collection>,
        /// A brief description of the nft.
        description: String,
        /// The id of the nft, which should be unique within the collection; The length of
        /// name should be smaller than 128, characters
        token_id: String,
        /// The Uniform Resource Identifier (uri) pointing to the JSON file stored in off-chain
        /// storage; the URL length will likely need a maximum any suggestions?
        uri: String
    }

    /// This enables burning an NFT, if possible, it will also delete the object. Note, the data
    /// in inner and self occupies 32-bytes each, rather than have both, this data structure makes
    /// a small optimization to support either and take a fixed amount of 34-bytes.
    struct BurnRef has drop, store {
        delete_ref: object::DeleteRef
    }

    /// This enables mutating description and URI by higher level services.
    struct MutatorRef has drop, store {
        self: address
    }

    #[event]
    /// Contains the mutated fields name. This makes the life of indexers easier, so that they can
    /// directly understand the behavior in a writeset.
    struct MutationEvent has drop, store {
        nft: address,
        mutated_field_name: String,
        old_value: String,
        new_value: String
    }

    /// Struct for nft info query response
    struct NftInfoResponse has drop {
        collection: Object<Collection>,
        description: String,
        token_id: String,
        uri: String
    }

    fun assert_token_id(token_id: &String) {
        let len = string::length(token_id);
        assert!(
            len <= MAX_NFT_TOKEN_ID_LENGTH,
            error::out_of_range(ENFT_TOKEN_ID_TOO_LONG)
        );
        assert!(
            string::index_of(token_id, &string::utf8(b":")) == len,
            error::invalid_argument(EINVALID_TOKEN_ID)
        );
    }

    inline fun create_common(
        owner: &signer,
        constructor_ref: &ConstructorRef,
        collection: Object<Collection>,
        description: String,
        token_id: String,
        royalty: Option<Royalty>,
        uri: String
    ) {
        // only the collection owner can create nfts
        assert!(
            object::owner(collection) == signer::address_of(owner),
            error::unauthenticated(ENOT_OWNER)
        );
        assert_token_id(&token_id);
        assert!(
            string::length(&description) <= MAX_DESCRIPTION_LENGTH,
            error::out_of_range(EDESCRIPTION_TOO_LONG)
        );
        assert!(
            string::length(&uri) <= MAX_URI_LENGTH,
            error::out_of_range(EURI_TOO_LONG)
        );

        let object_signer = object::generate_signer(constructor_ref);
        collection::increment_supply(
            collection,
            token_id,
            signer::address_of(&object_signer)
        );

        let nft = Nft { collection, description, token_id, uri };
        move_to(&object_signer, nft);

        if (option::is_some(&royalty)) {
            royalty::init(
                constructor_ref,
                option::extract(&mut royalty)
            )
        };
    }

    /// Creates a new nft object from a nft name and returns the ConstructorRef for
    /// additional specialization.
    public fun create(
        owner: &signer,
        collection: Object<Collection>,
        description: String,
        token_id: String,
        royalty: Option<Royalty>,
        uri: String
    ): ConstructorRef {
        let owner_address = signer::address_of(owner);
        let creator_address = collection::creator(collection);
        let collection_name = collection::name(collection);
        let seed = create_nft_seed(&collection_name, &token_id);

        let constructor_ref =
            object::create_nft_object(owner_address, creator_address, seed);
        create_common(
            owner,
            &constructor_ref,
            collection,
            description,
            token_id,
            royalty,
            uri
        );
        constructor_ref
    }

    /// Generates the nft's address based upon the creator's address, the collection's name and the nft's token_id.
    public fun create_nft_address(
        creator: address, collection: &String, token_id: &String
    ): address {
        object::create_object_address(
            &creator,
            create_nft_seed(collection, token_id)
        )
    }

    /// Named objects are derived from a seed, the nft's seed is its token_id appended to the collection's name.
    public fun create_nft_seed(collection: &String, token_id: &String): vector<u8> {
        assert!(
            string::length(token_id) <= MAX_NFT_TOKEN_ID_LENGTH,
            error::out_of_range(ENFT_TOKEN_ID_TOO_LONG)
        );
        let seed = *string::bytes(collection);
        vector::append(&mut seed, b"::");
        vector::append(&mut seed, *string::bytes(token_id));
        seed
    }

    /// Creates a MutatorRef, which gates the ability to mutate any fields that support mutation.
    public fun generate_mutator_ref(ref: &ConstructorRef): MutatorRef {
        let object = object::object_from_constructor_ref<Nft>(ref);
        MutatorRef { self: object::object_address(&object) }
    }

    /// Creates a BurnRef, which gates the ability to burn the given nft.
    public fun generate_burn_ref(ref: &ConstructorRef): BurnRef {
        let delete_ref = object::generate_delete_ref(ref);
        BurnRef { delete_ref }
    }

    /// Extracts the nfts address from a BurnRef.
    public fun address_from_burn_ref(ref: &BurnRef): address {
        object::address_from_delete_ref(&ref.delete_ref)
    }

    // Accessors

    inline fun borrow<T: key>(nft: Object<T>): &Nft acquires Nft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<Nft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        borrow_global<Nft>(nft_address)
    }

    #[view]
    public fun is_nft(object_address: address): bool {
        exists<Nft>(object_address)
    }

    #[view]
    public fun creator<T: key>(nft: Object<T>): address acquires Nft {
        collection::creator(borrow(nft).collection)
    }

    #[view]
    public fun collection_name<T: key>(nft: Object<T>): String acquires Nft {
        collection::name(borrow(nft).collection)
    }

    #[view]
    public fun collection_object<T: key>(nft: Object<T>): Object<Collection> acquires Nft {
        borrow(nft).collection
    }

    #[view]
    public fun description<T: key>(nft: Object<T>): String acquires Nft {
        borrow(nft).description
    }

    #[view]
    public fun token_id<T: key>(nft: Object<T>): String acquires Nft {
        borrow(nft).token_id
    }

    #[view]
    public fun uri<T: key>(nft: Object<T>): String acquires Nft {
        borrow(nft).uri
    }

    #[view]
    public fun royalty<T: key>(nft: Object<T>): Option<Royalty> acquires Nft {
        borrow(nft);
        let royalty = royalty::get(nft);
        if (option::is_some(&royalty)) {
            royalty
        } else {
            let creator = creator(nft);
            let collection_name = collection_name(nft);
            let collection_address =
                collection::create_collection_address(creator, &collection_name);
            let collection =
                object::address_to_object<collection::Collection>(collection_address);
            royalty::get(collection)
        }
    }

    #[view]
    public fun nft_info(nft: Object<Nft>): NftInfoResponse acquires Nft {
        let nft = borrow(nft);
        NftInfoResponse {
            collection: nft.collection,
            description: nft.description,
            token_id: nft.token_id,
            uri: nft.uri
        }
    }

    #[view]
    public fun nft_infos(nfts: vector<Object<Nft>>): vector<NftInfoResponse> acquires Nft {
        let len = vector::length(&nfts);
        assert!(
            len <= MAX_QUERY_LENGTH,
            error::invalid_argument(EQUERY_LENGTH_TOO_LONG)
        );
        let index = 0;
        let res: vector<NftInfoResponse> = vector[];
        while (index < len) {
            let nft = vector::borrow(&nfts, index);
            vector::push_back(&mut res, nft_info(*nft));
            index = index + 1;
        };

        res
    }

    // Mutators

    inline fun borrow_mut(mutator_ref: &MutatorRef): &mut Nft acquires Nft {
        assert!(
            exists<Nft>(mutator_ref.self),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        borrow_global_mut<Nft>(mutator_ref.self)
    }

    public fun burn(burn_ref: BurnRef) acquires Nft {
        let BurnRef { delete_ref } = burn_ref;
        let addr = object::address_from_delete_ref(&delete_ref);
        object::delete(delete_ref);

        if (royalty::exists_at(addr)) {
            royalty::delete(addr)
        };

        let Nft { collection, description: _, token_id, uri: _ } = move_from<Nft>(addr);

        collection::decrement_supply(collection, token_id, addr);
    }

    public fun set_description(
        mutator_ref: &MutatorRef, description: String
    ) acquires Nft {
        assert!(
            string::length(&description) <= MAX_DESCRIPTION_LENGTH,
            error::out_of_range(EDESCRIPTION_TOO_LONG)
        );
        let nft = borrow_mut(mutator_ref);
        event::emit(
            MutationEvent {
                nft: mutator_ref.self,
                mutated_field_name: string::utf8(b"description"),
                old_value: nft.description,
                new_value: description
            }
        );
        nft.description = description;
    }

    public fun set_uri(mutator_ref: &MutatorRef, uri: String) acquires Nft {
        assert!(
            string::length(&uri) <= MAX_URI_LENGTH,
            error::out_of_range(EURI_TOO_LONG)
        );
        let nft = borrow_mut(mutator_ref);
        event::emit(
            MutationEvent {
                nft: mutator_ref.self,
                mutated_field_name: string::utf8(b"uri"),
                old_value: nft.uri,
                new_value: uri
            }
        );
        nft.uri = uri;
    }

    #[test_only]
    use initia_std::bigdecimal;

    #[test_only]
    fun generate_collection_object(
        creator: &signer, collection_name: &String
    ): Object<Collection> {
        let creator_address = signer::address_of(creator);
        let collection_address =
            collection::create_collection_address(creator_address, collection_name);
        object::address_to_object<Collection>(collection_address)
    }

    #[test(creator = @0x123, owner = @0x456, trader = @0x789)]
    fun test_create_after_collection_transfer(
        creator: &signer, owner: &signer
    ) {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);

        // transfer collection to owner
        let owner_address = signer::address_of(owner);
        object::transfer(
            creator,
            generate_collection_object(creator, &collection_name),
            owner_address
        );

        // create nft
        create_nft_helper(owner, creator, collection_name, token_id);

        let creator_address = signer::address_of(creator);
        let nft_addr = create_nft_address(creator_address, &collection_name, &token_id);
        let nft = object::address_to_object<Nft>(nft_addr);
        assert!(object::owner(nft) == owner_address, 1);
    }

    #[test(creator = @0x123, trader = @0x456)]
    fun test_create_and_transfer(creator: &signer, trader: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);
        create_nft_helper(creator, creator, collection_name, token_id);

        let creator_address = signer::address_of(creator);
        let nft_addr = create_nft_address(creator_address, &collection_name, &token_id);
        let nft = object::address_to_object<Nft>(nft_addr);
        assert!(object::owner(nft) == creator_address, 1);
        object::transfer(creator, nft, signer::address_of(trader));
        assert!(
            object::owner(nft) == signer::address_of(trader),
            1
        );

        let expected_royalty =
            royalty::create(
                bigdecimal::from_ratio_u64(25, 10000),
                creator_address
            );
        assert!(
            option::some(expected_royalty) == royalty(nft),
            2
        );
    }

    #[test(creator = @0x123)]
    fun test_collection_royalty(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        let creator_address = signer::address_of(creator);
        let expected_royalty =
            royalty::create(
                bigdecimal::from_ratio_u64(10, 1000),
                creator_address
            );
        collection::create_fixed_collection(
            creator,
            string::utf8(b"collection description"),
            5,
            collection_name,
            option::some(expected_royalty),
            string::utf8(b"collection uri")
        );

        create(
            creator,
            generate_collection_object(creator, &collection_name),
            string::utf8(b"nft description"),
            token_id,
            option::none(),
            string::utf8(b"nft uri")
        );

        let nft_addr = create_nft_address(creator_address, &collection_name, &token_id);
        let nft = object::address_to_object<Nft>(nft_addr);
        assert!(
            option::some(expected_royalty) == royalty(nft),
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_no_royalty(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        collection::create_unlimited_collection(
            creator,
            string::utf8(b"collection description"),
            collection_name,
            option::none(),
            string::utf8(b"collection uri")
        );

        create(
            creator,
            generate_collection_object(creator, &collection_name),
            string::utf8(b"nft description"),
            token_id,
            option::none(),
            string::utf8(b"nft uri")
        );

        let creator_address = signer::address_of(creator);
        let nft_addr = create_nft_address(creator_address, &collection_name, &token_id);
        let nft = object::address_to_object<Nft>(nft_addr);
        assert!(option::none() == royalty(nft), 0);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x10009, location = Self)]
    fun test_create_nft_with_invalid_token_id(creator: &signer) {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id::hello");
        create_collection_helper(creator, collection_name, 1);
        create_nft_helper(creator, creator, collection_name, token_id);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x20002, location = initia_std::collection)]
    fun test_too_many_nfts(creator: &signer) {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");
        let token_id2 = string::utf8(b"nft token_id2");

        create_collection_helper(creator, collection_name, 1);
        create_nft_helper(creator, creator, collection_name, token_id);
        create_nft_helper(creator, creator, collection_name, token_id2);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 0x80001, location = initia_std::object)]
    fun test_duplicate_nfts(creator: &signer) {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 2);
        create_nft_helper(creator, creator, collection_name, token_id);
        create_nft_helper(creator, creator, collection_name, token_id);
    }

    #[test(creator = @0x123)]
    fun test_set_description(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);
        let mutator_ref = create_nft_with_mutation_ref(
            creator, collection_name, token_id
        );
        let nft =
            object::address_to_object<Nft>(
                create_nft_address(
                    signer::address_of(creator),
                    &collection_name,
                    &token_id
                )
            );

        let description = string::utf8(b"no fail");
        assert!(description != description(nft), 0);
        set_description(&mutator_ref, description);
        assert!(description == description(nft), 1);
    }

    #[test(creator = @0x123)]
    fun test_set_uri(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);
        let mutator_ref = create_nft_with_mutation_ref(
            creator, collection_name, token_id
        );
        let nft =
            object::address_to_object<Nft>(
                create_nft_address(
                    signer::address_of(creator),
                    &collection_name,
                    &token_id
                )
            );

        let uri = string::utf8(b"no fail");
        assert!(uri != uri(nft), 0);
        set_uri(&mutator_ref, uri);
        assert!(uri == uri(nft), 1);
    }

    #[test(creator = @0x123)]
    fun test_burn_without_royalty(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);
        let constructor_ref =
            create(
                creator,
                generate_collection_object(creator, &collection_name),
                string::utf8(b"nft description"),
                token_id,
                option::none(),
                string::utf8(b"nft uri")
            );
        let burn_ref = generate_burn_ref(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        assert!(exists<Nft>(nft_addr), 0);
        assert!(!royalty::exists_at(nft_addr), 3);
        burn(burn_ref);
        assert!(!exists<Nft>(nft_addr), 2);
        assert!(!royalty::exists_at(nft_addr), 3);
    }

    #[test(creator = @0x123)]
    fun test_burn_with_royalty(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);
        let constructor_ref =
            create(
                creator,
                generate_collection_object(creator, &collection_name),
                string::utf8(b"nft description"),
                token_id,
                option::some(
                    royalty::create(
                        bigdecimal::from_ratio_u64(1, 1),
                        signer::address_of(creator)
                    )
                ),
                string::utf8(b"nft uri")
            );
        let burn_ref = generate_burn_ref(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        assert!(exists<Nft>(nft_addr), 0);
        assert!(royalty::exists_at(nft_addr), 1);
        burn(burn_ref);
        assert!(!exists<Nft>(nft_addr), 2);
        assert!(!royalty::exists_at(nft_addr), 3);
        assert!(!object::is_object(nft_addr), 4);
    }

    #[test(creator = @0x123)]
    fun test_burn_and_mint(creator: &signer) acquires Nft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft token_id");

        create_collection_helper(creator, collection_name, 1);
        let constructor_ref =
            create(
                creator,
                generate_collection_object(creator, &collection_name),
                string::utf8(b"nft description"),
                token_id,
                option::none(),
                string::utf8(b"nft uri")
            );
        let burn_ref = generate_burn_ref(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        assert!(exists<Nft>(nft_addr), 0);
        burn(burn_ref);
        assert!(!exists<Nft>(nft_addr), 1);
        // mint again
        create(
            creator,
            generate_collection_object(creator, &collection_name),
            string::utf8(b"nft description"),
            token_id,
            option::none(),
            string::utf8(b"nft uri")
        );
        assert!(exists<Nft>(nft_addr), 2);
    }

    #[test_only]
    fun create_collection_helper(
        creator: &signer, collection_name: String, max_supply: u64
    ) {
        collection::create_fixed_collection(
            creator,
            string::utf8(b"collection description"),
            max_supply,
            collection_name,
            option::none(),
            string::utf8(b"collection uri")
        );
    }

    #[test_only]
    fun create_nft_helper(
        owner: &signer,
        creator: &signer,
        collection_name: String,
        token_id: String
    ): ConstructorRef {
        create(
            owner,
            generate_collection_object(creator, &collection_name),
            string::utf8(b"nft description"),
            token_id,
            option::some(
                royalty::create(
                    bigdecimal::from_ratio_u64(25, 10000),
                    signer::address_of(creator)
                )
            ),
            string::utf8(b"uri")
        )
    }

    #[test_only]
    fun create_nft_with_mutation_ref(
        creator: &signer, collection_name: String, token_id: String
    ): MutatorRef {
        let constructor_ref = create_nft_helper(
            creator, creator, collection_name, token_id
        );
        generate_mutator_ref(&constructor_ref)
    }
}
