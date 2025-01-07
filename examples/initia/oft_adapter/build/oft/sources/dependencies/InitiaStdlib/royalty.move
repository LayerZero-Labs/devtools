/// This defines an object-based Royalty. The royalty can be applied to either a collection or a
/// nft. Applications should read the royalty from the nft, as it will read the appropriate
/// royalty.
module initia_std::royalty {
    use std::error;
    use std::option::{Self, Option};
    use initia_std::bigdecimal::{Self, BigDecimal};
    use initia_std::object::{Self, ConstructorRef, ExtendRef, Object};

    friend initia_std::nft;

    /// Royalty does not exist
    const EROYALTY_DOES_NOT_EXIST: u64 = 1;
    /// The royalty cannot be greater than 100%
    const EROYALTY_EXCEEDS_MAXIMUM: u64 = 2;
    /// The royalty denominator cannot be 0
    const EROYALTY_DENOMINATOR_IS_ZERO: u64 = 3;

    /// The royalty of a nft within this collection
    ///
    /// Royalties are optional for a collection.
    struct Royalty has copy, drop, key {
        royalty: BigDecimal,
        /// creators.
        payee_address: address
    }

    /// This enables creating or overwriting a `MutatorRef`.
    struct MutatorRef has drop, store {
        inner: ExtendRef
    }

    /// Add a royalty, given a ConstructorRef.
    public fun init(ref: &ConstructorRef, royalty: Royalty) {
        let signer = object::generate_signer(ref);
        move_to(&signer, royalty);
    }

    /// Set the royalty if it does not exist, replace it otherwise.
    public fun update(mutator_ref: &MutatorRef, royalty: Royalty) acquires Royalty {
        let addr = object::address_from_extend_ref(&mutator_ref.inner);
        if (exists<Royalty>(addr)) {
            move_from<Royalty>(addr);
        };

        let signer = object::generate_signer_for_extending(&mutator_ref.inner);
        move_to(&signer, royalty);
    }

    /// Creates a new royalty, verifying that it is a valid percentage
    public fun create(royalty: BigDecimal, payee_address: address): Royalty {
        assert!(
            bigdecimal::le(royalty, bigdecimal::one()),
            error::out_of_range(EROYALTY_EXCEEDS_MAXIMUM)
        );

        Royalty { royalty, payee_address }
    }

    public fun generate_mutator_ref(ref: ExtendRef): MutatorRef {
        MutatorRef { inner: ref }
    }

    public fun exists_at(addr: address): bool {
        exists<Royalty>(addr)
    }

    public(friend) fun delete(addr: address) acquires Royalty {
        assert!(
            exists<Royalty>(addr),
            error::not_found(EROYALTY_DOES_NOT_EXIST)
        );
        move_from<Royalty>(addr);
    }

    // Accessors
    public fun get<T: key>(maybe_royalty: Object<T>): Option<Royalty> acquires Royalty {
        let obj_addr = object::object_address(&maybe_royalty);
        if (exists<Royalty>(obj_addr)) {
            option::some(*borrow_global<Royalty>(obj_addr))
        } else {
            option::none()
        }
    }

    public fun royalty(royalty: &Royalty): BigDecimal {
        royalty.royalty
    }

    public fun payee_address(royalty: &Royalty): address {
        royalty.payee_address
    }

    #[test(creator = @0x123)]
    fun test_none(creator: &signer) acquires Royalty {
        let constructor_ref = object::create_named_object(creator, b"");
        let object =
            object::object_from_constructor_ref<object::ObjectCore>(&constructor_ref);
        assert!(option::none() == get(object), 0);
    }

    #[test(creator = @0x123)]
    fun test_init_and_update(creator: &signer) acquires Royalty {
        let constructor_ref = object::create_named_object(creator, b"");
        let object =
            object::object_from_constructor_ref<object::ObjectCore>(&constructor_ref);
        let init_royalty = create(bigdecimal::from_ratio_u64(1, 2), @0x123);
        init(&constructor_ref, init_royalty);
        assert!(option::some(init_royalty) == get(object), 0);
        assert!(
            royalty(&init_royalty) == bigdecimal::from_ratio_u64(1, 2),
            1
        );
        assert!(payee_address(&init_royalty) == @0x123, 2);

        let mutator_ref =
            generate_mutator_ref(object::generate_extend_ref(&constructor_ref));
        let update_royalty = create(bigdecimal::from_ratio_u64(2, 5), @0x456);
        update(&mutator_ref, update_royalty);
        assert!(option::some(update_royalty) == get(object), 3);
        assert!(
            royalty(&update_royalty) == bigdecimal::from_ratio_u64(2, 5),
            4
        );
        assert!(payee_address(&update_royalty) == @0x456, 5);
    }

    #[test(creator = @0x123)]
    fun test_update_only(creator: &signer) acquires Royalty {
        let constructor_ref = object::create_named_object(creator, b"");
        let object =
            object::object_from_constructor_ref<object::ObjectCore>(&constructor_ref);
        assert!(option::none() == get(object), 0);

        let mutator_ref =
            generate_mutator_ref(object::generate_extend_ref(&constructor_ref));
        let update_royalty = create(bigdecimal::from_ratio_u64(1, 5), @0x123);
        update(&mutator_ref, update_royalty);
        assert!(option::some(update_royalty) == get(object), 1);
    }

    #[test]
    #[expected_failure(abort_code = 0x60001, location = Self)]
    fun test_does_not_exist() acquires Royalty {
        delete(@0x1);
    }

    #[test]
    #[expected_failure(abort_code = 0x20002, location = Self)]
    fun test_exceeds_maximum() {
        create(bigdecimal::from_ratio_u64(6, 5), @0x1);
    }
}
