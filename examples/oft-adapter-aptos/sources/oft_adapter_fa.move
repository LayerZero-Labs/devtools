/// This is an implementation of a FungibleAsset standard, Adapter-style OFT.
///
/// An adapter can be used with a FungibleAsset that is already deployed, which cannot share burn and mint
/// capabilities. This relies on locking and unlocking the FungibleAsset in an escrow account rather than minting and
/// burning.
///
/// Adapter OFTs should only be deployed on one chain per token (with the other EIDs having Native/mint-and-burn OFTs),
/// because there is not a rebalancing mechanism that can ensure pools maintain sufficient balance.
module oft::oft_adapter_fa {
    use std::coin::Coin;
    use std::fungible_asset::{Self, FungibleAsset, Metadata};
    use std::object::{Self, address_to_object, ExtendRef, Object, object_exists};
    use std::option::{Self, Option};
    use std::primary_fungible_store;
    use std::signer::address_of;

    use endpoint_v2_common::bytes32::Bytes32;
    use oft::oapp_core::combine_options;
    use oft::oapp_store::OAPP_ADDRESS;
    use oft::oft_core;
    use oft_common::oft_fee_detail::OftFeeDetail;
    use oft_common::oft_limit::{new_unbounded_oft_limit, OftLimit};

    friend oft::oft;
    friend oft::oapp_receive;

    #[test_only]
    friend oft::oft_adapter_fa_tests;

    struct OftAdapterFaStore has key {
        metadata: Object<Metadata>,
        escrow_extend_ref: ExtendRef,
    }

    // ================================================= OFT Handlers =================================================

    /// The default *credit* behavior for a Adapter OFT is to unlock the amount from escrow and credit the recipient
    public(friend) fun credit(
        to: address,
        amount_ld: u64,
        _src_eid: u32,
        lz_receive_value: Option<FungibleAsset>,
    ): u64 acquires OftAdapterFaStore {
        // Default implementation does not make special use of LZ Receive Value sent; just deposit to the OFT address
        option::for_each(lz_receive_value, |fa| primary_fungible_store::deposit(OAPP_ADDRESS(), fa));

        // unlock the amount from escrow
        let escrow_signer = &object::generate_signer_for_extending(borrow_escrow_extend_ref());
        primary_fungible_store::transfer(escrow_signer, metadata(), to, amount_ld);

        amount_ld
    }

    /// The default *debit* behavior for a Adapter OFT is to deduct the amount from the sender and lock the deducted
    /// amount in escrow
    /// @return (amount_sent_ld, amount_received_ld)
    public(friend) fun debit_fungible_asset(
        fa: &mut FungibleAsset,
        min_amount_ld: u64,
        dst_eid: u32,
    ): (u64, u64) acquires OftAdapterFaStore {
        assert_metadata(fa);

        // Calculate the exact send amount
        let amount_ld = fungible_asset::amount(fa);
        let (amount_sent_ld, amount_received_ld) = debit_view(amount_ld, min_amount_ld, dst_eid);

        // Extract the exact send amount from the provided fungible asset
        let extracted_fa = fungible_asset::extract(fa, amount_sent_ld);

        // Lock the amount in escrow
        let escrow_address = escrow_address();
        primary_fungible_store::deposit(escrow_address, extracted_fa);

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

    /// Update this to override the Executor and DVN options of the OFT transmission
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

    // Deposit coin function abstracted from `oft.move` for cross-chain flexibility
    public(friend) fun deposit_coin<CoinType>(_account: address, _coin: Coin<CoinType>) {
        abort ENOT_IMPLEMENTED
    }

    // Withdraw coin function abstracted from `oft.move` for cross-chain flexibility
    public(friend) fun withdraw_coin<CoinType>(_account: &signer, _amount_ld: u64): Coin<CoinType> {
        abort ENOT_IMPLEMENTED
    }

    // =================================================== Metadata ===================================================

    public(friend) fun send_standards_supported(): vector<vector<u8>> {
        vector[b"fungible_asset"]
    }

    public(friend) fun metadata(): Object<Metadata> acquires OftAdapterFaStore {
        borrow_global<OftAdapterFaStore>(OAPP_ADDRESS()).metadata
    }

    fun assert_metadata(fa: &FungibleAsset) acquires OftAdapterFaStore {
        let fa_metadata = fungible_asset::metadata_from_asset(fa);
        assert!(fa_metadata == metadata(), EWRONG_FA_METADATA);
    }

    public(friend) fun balance(account: address): u64 acquires OftAdapterFaStore {
        primary_fungible_store::balance(account, metadata())
    }

    // Present for compatibility only
    struct PlaceholderCoin {}

    // ================================================ Initialization ================================================

    // This initialize function is called from `oft.move`.
    public entry fun initialize(account: &signer, token_metadata_address: address, shared_decimals: u8) {
        assert!(address_of(account) == OAPP_ADDRESS(), EUNAUTHORIZED);

        assert!(object_exists<Metadata>(token_metadata_address), EINVALID_METADATA_ADDRESS);
        let metadata = address_to_object<Metadata>(token_metadata_address);
        let constructor_ref = &object::create_named_object(account, b"fa_escrow");
        object::disable_ungated_transfer(&object::generate_transfer_ref(constructor_ref));
        let escrow_extend_ref = object::generate_extend_ref(constructor_ref);
        move_to(account, OftAdapterFaStore { metadata, escrow_extend_ref });

        let local_decimals = fungible_asset::decimals(metadata);
        oft_core::initialize(account, local_decimals, shared_decimals);
    }

    // ================================================ Storage Helpers ===============================================

    inline fun borrow_escrow_extend_ref(): &ExtendRef {
        &borrow_global<OftAdapterFaStore>(OAPP_ADDRESS()).escrow_extend_ref
    }

    #[view]
    public fun escrow_address(): address acquires OftAdapterFaStore {
        object::address_from_extend_ref(borrow_escrow_extend_ref())
    }

    // ================================================== Error Codes =================================================

    const EINVALID_METADATA_ADDRESS: u64 = 1;
    const ENOT_IMPLEMENTED: u64 = 2;
    const EUNAUTHORIZED: u64 = 3;
    const EWRONG_FA_METADATA: u64 = 4;
}