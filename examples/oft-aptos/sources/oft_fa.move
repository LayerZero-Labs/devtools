/// This is an implementation of a FungibleAsset-standard, Native OFT.
///
/// This creates a FungibleAsset upon initialization and mints and burns tokens on receive and send respectively.
/// This can be modified to accept mint, burn, and metadata references of an existing FungibleAsset upon initialization
/// rather than creating a new FungibleAsset.
module oft::oft_fa {
    use std::coin::Coin;
    use std::fungible_asset::{Self, BurnRef, FungibleAsset, Metadata, mint_ref_metadata, MintRef};
    use std::object::{Self, Object};
    use std::option::{Self, Option};
    use std::primary_fungible_store;
    use std::signer::address_of;
    use std::string::utf8;

    use endpoint_v2_common::bytes32::Bytes32;
    use oft::oapp_core::combine_options;
    use oft::oapp_store::OAPP_ADDRESS;
    use oft::oft_core;
    use oft_common::oft_fee_detail::OftFeeDetail;
    use oft_common::oft_limit::{new_unbounded_oft_limit, OftLimit};

    friend oft::oft;
    friend oft::oapp_receive;

    #[test_only]
    friend oft::oft_fa_tests;

    struct OftNativeFaStore has key {
        metadata: Object<Metadata>,
        mint_ref: MintRef,
        burn_ref: BurnRef,
    }

    // ================================================= OFT Handlers =================================================

    /// The default *credit* behavior for a Native OFT is to mint the amount and transfer to the recipient
    public(friend) fun credit(
        to: address,
        amount_ld: u64,
        _src_eid: u32,
        lz_receive_value: Option<FungibleAsset>,
    ): u64 acquires OftNativeFaStore {
        // Default implementation does not make special use of LZ Receive Value sent; just deposit to the OFT address
        option::for_each(lz_receive_value, |fa| primary_fungible_store::deposit(OAPP_ADDRESS(), fa));

        // mint the amount to the recipient
        let mint_ref = borrow_mint_ref();
        primary_fungible_store::mint(mint_ref, to, amount_ld);

        amount_ld
    }

    /// The default *debit* behavior for a Native OFT is to deduct the amount from the sender and burn the deducted
    /// amount
    /// @return (amount_sent_ld, amount_received_ld)
    public(friend) fun debit_fungible_asset(
        fa: &mut FungibleAsset,
        min_amount_ld: u64,
        dst_eid: u32,
    ): (u64, u64) acquires OftNativeFaStore {
        assert_metadata(fa);

        // Calculate the exact send amount
        let amount_ld = fungible_asset::amount(fa);
        let (amount_sent_ld, amount_received_ld) = debit_view(amount_ld, min_amount_ld, dst_eid);

        // Extract the exact send amount from the provided fungible asset
        let extracted_fa = fungible_asset::extract(fa, amount_sent_ld);

        // Burn the extracted amount
        let burn_ref = borrow_burn_ref();
        fungible_asset::burn(burn_ref, extracted_fa);

        (amount_sent_ld, amount_received_ld)
    }

    // Unused in this implementation
    public(friend) fun debit_coin<CoinType>(_coin: &mut Coin<CoinType>, _min_amount_ld: u64, _dst_eid: u32): (u64, u64) {
        abort ENOT_IMPLEMENTED
    }

    /// The default *debit_view* behavior for an OFT is to remove dust and use remainder as both the sent and
    /// received amounts, reflecting that no additional fees are removed
    public(friend) fun debit_view(amount_ld: u64, min_amount_ld: u64, _dst_eid: u32): (u64, u64) {
        oft_core::no_fee_debit_view(amount_ld, min_amount_ld)
    }

    /// Change this to override the Executor and DVN options of the OFT transmission
    public(friend) fun build_options(
        message_type: u16,
        dst_eid: u32,
        extra_options: vector<u8>,
        _user_sender: address,
        _amount_received_ld: u64,
        _to: Bytes32,
        _compose_msg: vector<u8>,
        _oft_cmd: vector<u8>,
    ): vector<u8> {
        combine_options(dst_eid, message_type, extra_options)
    }

    /// Implement this function to inspect the message and options before quoting and sending
    public(friend) fun inspect_message(
        _message: &vector<u8>,
        _options: &vector<u8>,
        _is_sending: bool,
    ) {}

    /// Change this to override the OFT limit and fees provided when quoting. The fees should reflect the difference
    /// between the amount sent and the amount received returned from debit() and debit_view()
    public(friend) fun oft_limit_and_fees(
        _dst_eid: u32,
        _to: vector<u8>,
        _amount_ld: u64,
        _min_amount_ld: u64,
        _extra_options: vector<u8>,
        _compose_msg: vector<u8>,
        _oft_cmd: vector<u8>,
    ): (OftLimit, vector<OftFeeDetail>) {
        (new_unbounded_oft_limit(), vector[])
    }

    // =========================================== Coin Deposit / Withdrawal ==========================================

    public(friend) fun send_standards_supported(): vector<vector<u8>> {
        vector[b"fungible_asset"]
    }

    // Deposit coin function abstracted from `oft.move` for cross-chain flexibility
    public(friend) fun deposit_coin<CoinType>(_account: address, _coin: Coin<CoinType>) {
        abort ENOT_IMPLEMENTED
    }


    // Unused in this implementation
    public(friend) fun withdraw_coin<CoinType>(_account: &signer, _amount_ld: u64): Coin<CoinType> {
        abort ENOT_IMPLEMENTED
    }

    // =================================================== Metadata ===================================================

    public(friend) fun metadata(): Object<Metadata> acquires OftNativeFaStore {
        borrow_global<OftNativeFaStore>(OAPP_ADDRESS()).metadata
    }

    fun assert_metadata(fa: &FungibleAsset) acquires OftNativeFaStore {
        let fa_metadata = fungible_asset::metadata_from_asset(fa);
        assert!(fa_metadata == metadata(), EWRONG_FA_METADATA);
    }

    public(friend) fun balance(account: address): u64 acquires OftNativeFaStore {
        primary_fungible_store::balance(account, metadata())
    }

    // Present for compatibility only
    struct PlaceholderCoin {}

    // ================================================ Initialization ================================================

    // This initialize function is called from `oft.move`. It does not need to be directly invoked except for in
    // testing
    public entry fun initialize(
        account: &signer,
        token_name: vector<u8>,
        symbol: vector<u8>,
        icon_uri: vector<u8>,
        project_uri: vector<u8>,
        shared_decimals: u8,
        local_decimals: u8,
    ) {
        assert!(address_of(account) == OAPP_ADDRESS(), EUNAUTHORIZED);

        // Create the fungible asset
        let constructor_ref = &object::create_named_object(account, symbol);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(token_name),
            utf8(symbol),
            local_decimals,
            utf8(icon_uri),
            utf8(project_uri),
        );
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let metadata = mint_ref_metadata(&mint_ref);
        move_to(account, OftNativeFaStore { metadata, mint_ref, burn_ref });

        oft_core::initialize(account, local_decimals, shared_decimals);
    }

    // =================================================== Helpers ====================================================

    inline fun borrow_mint_ref(): &MintRef {
        &borrow_global<OftNativeFaStore>(OAPP_ADDRESS()).mint_ref
    }

    inline fun borrow_burn_ref(): &BurnRef {
        &borrow_global<OftNativeFaStore>(OAPP_ADDRESS()).burn_ref
    }

    #[test_only]
    public fun mint_tokens_for_test(amount_ld: u64): FungibleAsset acquires OftNativeFaStore {
        let mint_ref = borrow_mint_ref();
        fungible_asset::mint(mint_ref, amount_ld)
    }

    // ================================================== Error Codes =================================================

    const ENOT_IMPLEMENTED: u64 = 1;
    const EUNAUTHORIZED: u64 = 2;
    const EWRONG_FA_METADATA: u64 = 3;
}