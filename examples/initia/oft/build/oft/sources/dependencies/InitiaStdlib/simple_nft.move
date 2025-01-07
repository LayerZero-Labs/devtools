/// Sample of nft extension including metadata property type by using 0x1::initia_nft
module initia_std::simple_nft {
    use std::error;
    use std::option::{Self, Option};
    use std::string::String;
    use std::signer;
    use initia_std::object::{Self, Object};
    use initia_std::collection;
    use initia_std::property_map;
    use initia_std::royalty;
    use initia_std::nft;
    use initia_std::initia_nft::{Self, InitiaNft};
    use initia_std::bigdecimal::BigDecimal;

    /// The collection does not exist
    const ECOLLECTION_DOES_NOT_EXIST: u64 = 1;
    /// The nft does not exist
    const ENFT_DOES_NOT_EXIST: u64 = 2;
    /// The provided signer is not the creator
    const ENOT_CREATOR: u64 = 3;
    /// The provided signer is not the owner
    const ENOT_OWNER: u64 = 4;
    /// The property map being mutated is not mutable
    const EPROPERTIES_NOT_MUTABLE: u64 = 5;

    /// Storage state for managing the no-code Collection.
    struct SimpleNftCollection has key {
        /// Determines if the creator can mutate nft properties
        mutable_nft_properties: bool
    }

    /// Storage state for managing the no-code Nft.
    struct SimpleNft has key {
        /// Used to mutate properties
        property_mutator_ref: property_map::MutatorRef
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
            mutable_nft_properties,
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
        mutable_nft_properties: bool,
        mutable_nft_uri: bool,
        royalty: BigDecimal
    ): Object<SimpleNftCollection> {
        let (_, extend_ref) =
            initia_nft::create_collection_object(
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

        let object_signer = object::generate_signer_for_extending(&extend_ref);

        let simple_nft_collection = SimpleNftCollection { mutable_nft_properties };
        move_to(&object_signer, simple_nft_collection);
        object::address_to_object<SimpleNftCollection>(signer::address_of(&object_signer))
    }

    /// With an existing collection, directly mint a viable nft into the creators account.
    public entry fun mint(
        creator: &signer,
        collection: String,
        description: String,
        token_id: String,
        uri: String,
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>,
        to: Option<address>
    ) {
        let nft_object =
            mint_nft_object(
                creator,
                collection,
                description,
                token_id,
                uri,
                property_keys,
                property_types,
                property_values
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
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>
    ): Object<SimpleNft> {
        let (object, extend_ref) =
            initia_nft::mint_nft_object(
                creator,
                collection,
                description,
                token_id,
                uri,
                true
            );
        let s = object::generate_signer_for_extending(&extend_ref);

        let properties =
            property_map::prepare_input(
                property_keys,
                property_types,
                property_values
            );
        property_map::init(&s, properties);

        let simple_nft = SimpleNft {
            property_mutator_ref: property_map::generate_mutator_ref(&s)
        };
        move_to(&s, simple_nft);

        object::convert<InitiaNft, SimpleNft>(object)
    }

    // Nft accessors

    inline fun borrow<T: key>(nft: Object<T>): &SimpleNft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<SimpleNft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        borrow_global<SimpleNft>(nft_address)
    }

    #[view]
    public fun are_properties_mutable<T: key>(nft: Object<T>): bool acquires SimpleNftCollection {
        let collection = nft::collection_object(nft);
        borrow_collection(collection).mutable_nft_properties
    }

    // Nft mutators

    inline fun authorized_borrow<T: key>(nft: Object<T>, creator: &signer): &SimpleNft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<SimpleNft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );

        assert!(
            nft::creator(nft) == signer::address_of(creator),
            error::permission_denied(ENOT_CREATOR)
        );
        borrow_global<SimpleNft>(nft_address)
    }

    public entry fun burn<T: key>(owner: &signer, nft: Object<T>) acquires SimpleNft {
        let nft_address = object::object_address(&nft);
        assert!(
            exists<SimpleNft>(nft_address),
            error::not_found(ENFT_DOES_NOT_EXIST)
        );
        assert!(
            object::owns(nft, signer::address_of(owner)),
            error::permission_denied(ENOT_OWNER)
        );

        let simple_nft = move_from<SimpleNft>(object::object_address(&nft));
        let SimpleNft { property_mutator_ref } = simple_nft;
        property_map::burn(property_mutator_ref);
        initia_nft::burn(owner, nft);
    }

    public entry fun set_description<T: key>(
        creator: &signer, nft: Object<T>, description: String
    ) {
        initia_nft::set_description(creator, nft, description);
    }

    public entry fun set_uri<T: key>(
        creator: &signer, nft: Object<T>, uri: String
    ) {
        initia_nft::set_uri(creator, nft, uri);
    }

    public entry fun add_property<T: key>(
        creator: &signer,
        nft: Object<T>,
        key: String,
        type: String,
        value: vector<u8>
    ) acquires SimpleNftCollection, SimpleNft {
        let simple_nft = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::add(
            &simple_nft.property_mutator_ref,
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
    ) acquires SimpleNftCollection, SimpleNft {
        let simple_nft = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::add_typed(&simple_nft.property_mutator_ref, key, value);
    }

    public entry fun remove_property<T: key>(
        creator: &signer, nft: Object<T>, key: String
    ) acquires SimpleNftCollection, SimpleNft {
        let simple_nft = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::remove(&simple_nft.property_mutator_ref, &key);
    }

    public entry fun update_property<T: key>(
        creator: &signer,
        nft: Object<T>,
        key: String,
        type: String,
        value: vector<u8>
    ) acquires SimpleNftCollection, SimpleNft {
        let simple_nft = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::update(
            &simple_nft.property_mutator_ref,
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
    ) acquires SimpleNftCollection, SimpleNft {
        let simple_nft = authorized_borrow(nft, creator);
        assert!(
            are_properties_mutable(nft),
            error::permission_denied(EPROPERTIES_NOT_MUTABLE)
        );

        property_map::update_typed(&simple_nft.property_mutator_ref, &key, value);
    }

    // Collection accessors

    inline fun collection_object(creator: &signer, name: &String): Object<SimpleNftCollection> {
        let collection_addr =
            collection::create_collection_address(signer::address_of(creator), name);
        object::address_to_object<SimpleNftCollection>(collection_addr)
    }

    inline fun borrow_collection<T: key>(nft: Object<T>): &SimpleNftCollection {
        let collection_address = object::object_address(&nft);
        assert!(
            exists<SimpleNftCollection>(collection_address),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
        borrow_global<SimpleNftCollection>(collection_address)
    }

    public fun is_mutable_collection_description<T: key>(
        collection: Object<T>
    ): bool {
        initia_nft::is_mutable_collection_description(collection)
    }

    public fun is_mutable_collection_royalty<T: key>(
        collection: Object<T>
    ): bool {
        initia_nft::is_mutable_collection_royalty(collection)
    }

    public fun is_mutable_collection_uri<T: key>(collection: Object<T>): bool {
        initia_nft::is_mutable_collection_uri(collection)
    }

    public fun is_mutable_collection_nft_description<T: key>(
        collection: Object<T>
    ): bool {
        initia_nft::is_mutable_collection_nft_description(collection)
    }

    public fun is_mutable_collection_nft_uri<T: key>(
        collection: Object<T>
    ): bool {
        initia_nft::is_mutable_collection_nft_uri(collection)
    }

    public fun is_mutable_collection_nft_properties<T: key>(
        collection: Object<T>
    ): bool acquires SimpleNftCollection {
        borrow_collection(collection).mutable_nft_properties
    }

    // Collection mutators

    inline fun authorized_borrow_collection<T: key>(
        collection: Object<T>, creator: &signer
    ): &SimpleNftCollection {
        let collection_address = object::object_address(&collection);
        assert!(
            exists<SimpleNftCollection>(collection_address),
            error::not_found(ECOLLECTION_DOES_NOT_EXIST)
        );
        assert!(
            collection::creator(collection) == signer::address_of(creator),
            error::permission_denied(ENOT_CREATOR)
        );
        borrow_global<SimpleNftCollection>(collection_address)
    }

    public entry fun set_collection_description<T: key>(
        creator: &signer, collection: Object<T>, description: String
    ) {
        initia_nft::set_collection_description(creator, collection, description);
    }

    public fun set_collection_royalties<T: key>(
        creator: &signer, collection: Object<T>, royalty: royalty::Royalty
    ) {
        initia_nft::set_collection_royalties(creator, collection, royalty);
    }

    entry fun set_collection_royalties_call<T: key>(
        creator: &signer,
        collection: Object<T>,
        royalty: BigDecimal,
        payee_address: address
    ) {
        let royalty = royalty::create(royalty, payee_address);
        set_collection_royalties(creator, collection, royalty);
    }

    public entry fun set_collection_uri<T: key>(
        creator: &signer, collection: Object<T>, uri: String
    ) {
        initia_nft::set_collection_uri(creator, collection, uri);
    }

    // Tests

    #[test_only]
    use std::string;

    #[test_only]
    use initia_std::bigdecimal;

    #[test(creator = @0x123)]
    fun test_create_and_transfer(creator: &signer) {
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
    fun test_property_add(creator: &signer) acquires SimpleNftCollection, SimpleNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");
        let property_name = string::utf8(b"u8");
        let property_type = string::utf8(b"u8");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);
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
    fun test_property_typed_add(creator: &signer) acquires SimpleNftCollection, SimpleNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");
        let property_name = string::utf8(b"u8");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);
        add_typed_property<SimpleNft, u8>(creator, nft, property_name, 0x8);

        assert!(
            property_map::read_u8(nft, &property_name) == 0x8,
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_property_update(creator: &signer) acquires SimpleNftCollection, SimpleNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");
        let property_name = string::utf8(b"bool");
        let property_type = string::utf8(b"bool");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);
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
    fun test_property_update_typed(creator: &signer) acquires SimpleNftCollection, SimpleNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");
        let property_name = string::utf8(b"bool");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);
        update_typed_property<SimpleNft, bool>(creator, nft, property_name, false);

        assert!(
            !property_map::read_bool(nft, &property_name),
            0
        );
    }

    #[test(creator = @0x123)]
    fun test_property_remove(creator: &signer) acquires SimpleNftCollection, SimpleNft {
        let collection_name = string::utf8(b"collection name");
        let token_id = string::utf8(b"nft name");
        let property_name = string::utf8(b"bool");

        create_collection_helper(creator, collection_name, true);
        let nft = mint_helper(creator, collection_name, token_id);
        remove_property(creator, nft, property_name);
    }

    #[test_only]
    fun create_collection_helper(
        creator: &signer, collection_name: String, flag: bool
    ): Object<SimpleNftCollection> {
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
            flag,
            bigdecimal::from_ratio_u64(1, 100)
        )
    }

    #[test_only]
    fun mint_helper(
        creator: &signer, collection_name: String, token_id: String
    ): Object<SimpleNft> {
        mint_nft_object(
            creator,
            collection_name,
            string::utf8(b"description"),
            token_id,
            string::utf8(b"uri"),
            vector[string::utf8(b"bool")],
            vector[string::utf8(b"bool")],
            vector[vector[0x01]]
        )
    }
}
