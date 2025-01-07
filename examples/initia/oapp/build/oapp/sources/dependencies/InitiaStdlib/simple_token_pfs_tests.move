#[test_only]
module initia_std::simple_token_pfs_tests {
    use initia_std::fungible_asset::{create_test_token};
    use initia_std::primary_fungible_store::{
        balance,
        burn,
        deposit,
        mint,
        transfer,
        transfer_assert_minimum_deposit,
        withdraw,
        init_test_metadata_with_primary_store_enabled,
        is_frozen,
        set_frozen_flag,
        transfer_with_ref,
        deposit_with_ref,
        withdraw_with_ref,
        primary_store_exists,
        ensure_primary_store_exists
    };
    use 0xcafe::simple_token;
    use std::signer;

    #[test(creator = @0xcafe, aaron = @0xface)]
    fun test_default_behavior(creator: &signer, aaron: &signer) {
        let (creator_ref, metadata) = create_test_token(creator);
        init_test_metadata_with_primary_store_enabled(&creator_ref);
        simple_token::initialize(creator, &creator_ref);

        let creator_address = signer::address_of(creator);
        let aaron_address = signer::address_of(aaron);
        assert!(!primary_store_exists(creator_address, metadata), 1);
        assert!(!primary_store_exists(aaron_address, metadata), 2);
        assert!(balance(creator_address, metadata) == 0, 3);
        assert!(balance(aaron_address, metadata) == 0, 4);
        assert!(!is_frozen(creator_address, metadata), 5);
        assert!(!is_frozen(aaron_address, metadata), 6);
        ensure_primary_store_exists(creator_address, metadata);
        ensure_primary_store_exists(aaron_address, metadata);
        assert!(primary_store_exists(creator_address, metadata), 7);
        assert!(primary_store_exists(aaron_address, metadata), 8);
    }

    #[test(creator = @0xcafe, aaron = @0xface)]
    fun test_basic_flow(creator: &signer, aaron: &signer) {
        let (creator_ref, metadata) = create_test_token(creator);
        let (mint_ref, transfer_ref, burn_ref) =
            init_test_metadata_with_primary_store_enabled(&creator_ref);
        simple_token::initialize(creator, &creator_ref);

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

    #[test(creator = @0xcafe, aaron = @0xface)]
    fun test_basic_flow_with_min_balance(
        creator: &signer, aaron: &signer
    ) {
        let (creator_ref, metadata) = create_test_token(creator);
        let (mint_ref, _transfer_ref, _) =
            init_test_metadata_with_primary_store_enabled(&creator_ref);
        simple_token::initialize(creator, &creator_ref);

        let creator_address = signer::address_of(creator);
        let aaron_address = signer::address_of(aaron);
        assert!(balance(creator_address, metadata) == 0, 1);
        assert!(balance(aaron_address, metadata) == 0, 2);
        mint(&mint_ref, creator_address, 100);
        transfer_assert_minimum_deposit(creator, metadata, aaron_address, 80, 80);
        let fa = withdraw(aaron, metadata, 10);
        deposit(creator_address, fa);
        assert!(balance(creator_address, metadata) == 30, 3);
        assert!(balance(aaron_address, metadata) == 70, 4);
    }
}
