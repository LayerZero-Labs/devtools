/// This is an implementation of a Coin-standard, Native-style OFT.
///
/// This creates the Coin upon initialization and mints and burns tokens on receive and send respectively.
/// This can be modified to accept mint and burn capabilities of an existing Coin upon initialization rather
/// than creating a new Coin.
module oft::oft_coin {
    use std::aptos_account;
    use std::coin::{Self, BurnCapability, Coin, FreezeCapability, MintCapability};
    use std::fungible_asset::{FungibleAsset, Metadata};
    use std::object::Object;
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
    friend oft::oft_coin_tests;

    struct OftNativeCoinStore<phantom CoinType> has key {
        mint_cap: MintCapability<CoinType>,
        burn_cap: BurnCapability<CoinType>,
        freeze_cap: FreezeCapability<CoinType>,
    }

    // ************************************************* CONFIGURATION *************************************************

    // *Important*: Rename this and all occurrences to be consistent with the Token name and symbol
    struct PlaceholderCoin {}

    // *********************************************** END CONFIGURATION ***********************************************

    /// The default *credit* behavior for a Standard OFT is to mint the amount and transfer to the recipient. The
    /// recipient must have registered their coin store to receive the minted amount
    public(friend) fun credit(
        to: address,
        amount_ld: u64,
        _src_eid: u32,
        lz_receive_value: Option<FungibleAsset>,
    ): u64 acquires OftNativeCoinStore {
        // Default implementation does not make special use of LZ Receive Value sent; just deposit to the OFT address
        option::for_each(lz_receive_value, |fa| primary_fungible_store::deposit(OAPP_ADDRESS(), fa));

        // mint the amount to the recipient
        let mint_cap = borrow_mint_cap<PlaceholderCoin>();
        let minted = coin::mint(amount_ld, mint_cap);
        deposit_coin(to, minted);

        amount_ld
    }

    /// The default *debit* behavior for a Native OFT is to deduct the amount from the sender and burn the deducted
    /// amount
    /// @return (amount_sent_ld, amount_received_ld)
    public(friend) fun debit_coin<CoinType>(
        coin: &mut Coin<CoinType>,
        min_amount_ld: u64,
        dst_eid: u32,
    ): (u64, u64) acquires OftNativeCoinStore {
        // Calculate the exact send amount
        let amount_ld = coin::value(coin);
        let (amount_sent_ld, amount_received_ld) = debit_view(amount_ld, min_amount_ld, dst_eid);

        // Extract the exact send amount from the provided Coin
        let extracted_coin = coin::extract(coin, amount_sent_ld);

        // Burn the extracted amount
        let burn_cap = borrow_burn_cap();
        coin::burn(extracted_coin, burn_cap);

        (amount_sent_ld, amount_received_ld)
    }

    // Unused in this implementation
    public(friend) fun debit_fungible_asset(
        _fa: &mut FungibleAsset,
        _min_amount_ld: u64,
        _dst_eid: u32,
    ): (u64, u64) {
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

    // Deposit coin function abstracted from `oft.move` for cross-chain flexibility
    public(friend) fun deposit_coin<CoinType>(account: address, coin: Coin<CoinType>) {
        aptos_account::deposit_coins(account, coin)
    }

    // Withdraw coin function abstracted from `oft.move` for cross-chain flexibility
    public(friend) fun withdraw_coin<CoinType>(account: &signer, amount_ld: u64): Coin<CoinType> {
        coin::withdraw<CoinType>(account, amount_ld)
    }

    // =================================================== Metadata ===================================================

    public(friend) fun send_standards_supported(): vector<vector<u8>> {
        vector[b"coin"]
    }

    public(friend) fun metadata(): Object<Metadata> {
        abort ENOT_IMPLEMENTED
    }

    public(friend) fun balance(account: address): u64 {
        coin::balance<PlaceholderCoin>(account)
    }

    // ================================================ Initialization ================================================

    // This initialize function is called from `oft.move`. It does not need to be directly invoked except for in
    // testing
    public entry fun initialize(
        account: &signer,
        token_name: vector<u8>,
        symbol: vector<u8>,
        shared_decimals: u8,
        local_decimals: u8,
        monitor_supply: bool,
    ) {
        assert!(address_of(account) == OAPP_ADDRESS(), EUNAUTHORIZED);

        // Create the Coin
        let (
            burn_cap,
            freeze_cap,
            mint_cap,
        ) = coin::initialize<PlaceholderCoin>(
            account,
            utf8(token_name),
            utf8(symbol),
            local_decimals,
            monitor_supply,
        );

        move_to(account, OftNativeCoinStore { mint_cap, burn_cap, freeze_cap });
        oft_core::initialize(account, local_decimals, shared_decimals);
    }
    // =================================================== Helpers ====================================================

    inline fun borrow_mint_cap<CoinType>(): &MintCapability<CoinType> {
        &borrow_global<OftNativeCoinStore<CoinType>>(OAPP_ADDRESS()).mint_cap
    }

    inline fun borrow_burn_cap<CoinType>(): &BurnCapability<CoinType> {
        &borrow_global<OftNativeCoinStore<CoinType>>(OAPP_ADDRESS()).burn_cap
    }

    inline fun borrow_freeze_cap<CoinType>(): &FreezeCapability<CoinType> {
        &borrow_global<OftNativeCoinStore<CoinType>>(OAPP_ADDRESS()).freeze_cap
    }

    #[test_only]
    public fun mint_tokens_for_test<CoinType>(amount_ld: u64): Coin<CoinType> acquires OftNativeCoinStore {
        let mint_ref = borrow_mint_cap();
        coin::mint(amount_ld, mint_ref)
    }

    #[test_only]
    public fun burn_token_for_test<CoinType>(coin: Coin<CoinType>) acquires OftNativeCoinStore {
        let burn_ref = borrow_burn_cap();
        coin::burn(coin, burn_ref);
    }

    // ================================================== Error Codes =================================================

    const ENOT_IMPLEMENTED: u64 = 1;
    const EUNAUTHORIZED: u64 = 2;
}