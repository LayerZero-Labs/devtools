/// This is an implementation of a Coin-standard, Native-style OFT.
///
/// This creates the Coin upon initialization and mints and burns tokens on receive and send respectively.
/// This can be modified to accept mint and burn capabilities of an existing Coin upon initialization rather
/// than creating a new Coin.
module oft::oft_impl {
    use std::aptos_account;
    use std::coin::{Self, BurnCapability, Coin, FreezeCapability, MintCapability};
    use std::fungible_asset::{FungibleAsset, Metadata};
    use std::object::Object;
    use std::option::{Self, Option};
    use std::primary_fungible_store;
    use std::signer::address_of;
    use std::string::utf8;

    use endpoint_v2_common::bytes32::Bytes32;
    use oft::oapp_core::{assert_admin, combine_options};
    use oft::oapp_store::OAPP_ADDRESS;
    use oft::oft_core;
    use oft::oft_impl_config::{
        Self, assert_not_blocklisted, debit_view_with_possible_fee, fee_details_with_possible_fee,
        redirect_to_admin_if_blocklisted, release_rate_limit_capacity, try_consume_rate_limit_capacity,
    };
    use oft_common::oft_fee_detail::OftFeeDetail;
    use oft_common::oft_limit::{Self, OftLimit};

    friend oft::oft;
    friend oft::oapp_receive;

    #[test_only]
    friend oft::oft_coin_tests;

    struct OftImpl<phantom CoinType> has key {
        mint_cap: MintCapability<CoinType>,
        burn_cap: BurnCapability<CoinType>,
        freeze_cap: FreezeCapability<CoinType>,
    }

    // ************************************************* CONFIGURATION *************************************************

    // *Important*: Rename this and all occurrences to be consistent with the Token name and symbol
    struct PlaceholderCoin {}

    // *Important*: Update these values to match the Token name and symbol
    const TOKEN_NAME: vector<u8> = b"OFT Coin";
    const SYMBOL: vector<u8> = b"OFTC";
    const LOCAL_DECIMALS: u8 = 8;
    const SHARED_DECIMALS: u8 = 6;
    const MONITOR_SUPPLY: bool = false;

    // *********************************************** END CONFIGURATION ***********************************************

    /// The default *credit* behavior for a Standard OFT is to mint the amount and transfer to the recipient. The
    /// recipient must have registered their coin store to receive the minted amount
    public(friend) fun credit(
        to: address,
        amount_ld: u64,
        src_eid: u32,
        lz_receive_value: Option<FungibleAsset>,
    ): u64 acquires OftImpl {
        // Default implementation does not make special use of LZ Receive Value sent; just deposit to the OFT address
        option::for_each(lz_receive_value, |fa| primary_fungible_store::deposit(OAPP_ADDRESS(), fa));

        // Release rate limit capacity for the pathway (net inflow)
        release_rate_limit_capacity(src_eid, amount_ld);

        // Mint the amount to be added to the recipient
        let minted = coin::mint(amount_ld, &store<PlaceholderCoin>().mint_cap);

        // Deposit the extracted amount to the recipient, or redirect to the admin if the recipient is blocklisted
        deposit_coin(redirect_to_admin_if_blocklisted(to, amount_ld), minted);

        amount_ld
    }

    /// The default *debit* behavior for a standard OFT is to deduct the amount from the sender and burn the deducted
    /// amount
    /// @return (amount_sent_ld, amount_received_ld)
    public(friend) fun debit_coin<CoinType>(
        sender: address,
        coin: &mut Coin<CoinType>,
        min_amount_ld: u64,
        dst_eid: u32,
    ): (u64, u64) acquires OftImpl {
        assert_not_blocklisted(sender);
        try_consume_rate_limit_capacity(dst_eid, min_amount_ld);

        // Calculate the exact send amount
        let amount_ld = coin::value(coin);
        let (amount_sent_ld, amount_received_ld) = debit_view(amount_ld, min_amount_ld, dst_eid);

        // Extract the exact send amount from the provided Coin
        let extracted_coin = coin::extract(coin, amount_sent_ld);

        // Extract the fee and deposit it to the fee deposit address
        let fee_ld = (amount_sent_ld - amount_received_ld);
        if (fee_ld > 0) {
            let fee_coin = coin::extract(&mut extracted_coin, fee_ld);
            aptos_account::deposit_coins<CoinType>(fee_deposit_address(), fee_coin);
        };

        // Burn the extracted amount
        coin::burn(extracted_coin, &store().burn_cap);

        (amount_sent_ld, amount_received_ld)
    }

    // Unused in this implementation
    public(friend) fun debit_fungible_asset(
        _sender: address,
        _fa: &mut FungibleAsset,
        _min_amount_ld: u64,
        _dst_eid: u32,
    ): (u64, u64) {
        abort ENOT_IMPLEMENTED
    }

    /// The default *debit_view* behavior for a standard OFT is to remove dust and use remainder as both the sent and
    /// received amounts, reflecting that no additional fees are removed
    public(friend) fun debit_view(amount_ld: u64, min_amount_ld: u64, _dst_eid: u32): (u64, u64) {
        debit_view_with_possible_fee(amount_ld, min_amount_ld)
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
        dst_eid: u32,
        _to: vector<u8>,
        amount_ld: u64,
        min_amount_ld: u64,
        _extra_options: vector<u8>,
        _compose_msg: vector<u8>,
        _oft_cmd: vector<u8>,
    ): (OftLimit, vector<OftFeeDetail>) {
        (rate_limited_oft_limit(dst_eid), fee_details_with_possible_fee(amount_ld, min_amount_ld))
    }

    // =========================================== Coin Deposit / Withdrawal ==========================================

    /// Deposit coin function abstracted from `oft.move` for cross-chain flexibility
    public(friend) fun deposit_coin<CoinType>(account: address, coin: Coin<CoinType>) {
        aptos_account::deposit_coins(account, coin)
    }

    /// Withdraw coin function abstracted from `oft.move` for cross-chain flexibility
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

    // ================================================= Configuration ================================================

    /// Set the fee (in BPS) for outbound OFT sends
    public entry fun set_fee_bps(admin: &signer, fee_bps: u64) {
        assert_admin(address_of(admin));
        oft_impl_config::set_fee_bps(fee_bps);
    }

    #[view]
    /// Get the fee (in BPS) for outbound OFT sends
    public fun fee_bps(): u64 { oft_impl_config::fee_bps() }

    /// Set the fee deposit address for outbound OFT sends
    public entry fun set_fee_deposit_address(admin: &signer, fee_deposit_address: address) {
        assert_admin(address_of(admin));
        assert!(std::account::exists_at(fee_deposit_address), EINVALID_ACCOUNT);
        oft_impl_config::set_fee_deposit_address(fee_deposit_address);
    }

    #[view]
    /// Get the fee deposit address for outbound OFT sends
    public fun fee_deposit_address(): address { oft_impl_config::get_fee_deposit_address() }

    /// Permantently disable the ability to blocklist addresses
    public entry fun irrevocably_disable_blocklist(admin: &signer) {
        assert_admin(address_of(admin));
        oft_impl_config::irrevocably_disable_blocklist();
    }

    /// Set the blocklist status of a wallet address
    /// If a wallet is blocklisted
    /// - OFT sends from the wallet will be blocked
    /// - OFT receives to the wallet will be be diverted to the admin
    ///
    /// Note: this will not attempt to freeze the CoinStore of the blocklisted wallet; this must be done separately,
    /// to prevent the operation from reverting if the CoinStore is not yet registered
    public entry fun set_blocklist(admin: &signer, wallet: address, block: bool) {
        assert_admin(address_of(admin));
        oft_impl_config::set_blocklist(wallet, block);
    }

    #[view]
    /// Get the blocklist status of a wallet address
    public fun is_blocklisted(wallet: address): bool { oft_impl_config::is_blocklisted(wallet) }

    /// Set the rate limit configuration for a given endpoint ID
    /// The rate limit is the maximum amount of OFT that can be sent to the endpoint within a given window
    /// The rate limit capacity recovers linearly at a rate of limit / window_seconds
    public entry fun set_rate_limit(admin: &signer, eid: u32, limit: u64, window_seconds: u64) {
        assert_admin(address_of(admin));
        oft_impl_config::set_rate_limit(eid, limit, window_seconds);
    }

    #[view]
    /// Get the rate limit configuration for a given endpoint ID
    /// @return (limit, window_seconds)
    public fun rate_limit_config(eid: u32): (u64, u64) { oft_impl_config::rate_limit_config(eid) }

    #[view]
    /// Get the amount of rate limit capacity currently consumed on this pathway
    public fun rate_limit_in_flight(eid: u32): u64 { oft_impl_config::in_flight(eid) }

    #[view]
    /// Get the rate limit capacity for a given endpoint ID
    public fun rate_limit_capacity(eid: u32): u64 { oft_impl_config::rate_limit_capacity(eid) }

    /// Create an OftLimit that reflects the rate limit for a given endpoint ID
    public fun rate_limited_oft_limit(eid: u32): OftLimit {
        oft_limit::new_oft_limit(0, oft_impl_config::rate_limit_capacity(eid))
    }

    // ================================================ Initialization ================================================

    fun init_module(account: &signer) {
        // Create the Coin
        let (
            burn_cap,
            freeze_cap,
            mint_cap,
        ) = coin::initialize<PlaceholderCoin>(
            account,
            utf8(TOKEN_NAME),
            utf8(SYMBOL),
            LOCAL_DECIMALS,
            MONITOR_SUPPLY,
        );

        // Store the mint, burn, and freeze capabilities
        move_to(move account, OftImpl { burn_cap, freeze_cap, mint_cap });

        // Initialize the OFT Core module
        oft_core::initialize(LOCAL_DECIMALS, SHARED_DECIMALS);
    }

    #[test_only]
    public fun init_module_for_test() {
        init_module(&std::account::create_signer_for_test(OAPP_ADDRESS()));
    }

    // =================================================== Helpers ====================================================


    #[test_only]
    public fun mint_tokens_for_test<CoinType>(amount_ld: u64): Coin<CoinType> acquires OftImpl {
        coin::mint(amount_ld, &store().mint_cap)
    }

    #[test_only]
    public fun burn_token_for_test<CoinType>(coin: Coin<CoinType>) acquires OftImpl {
        coin::burn(coin, &store().burn_cap);
    }

    inline fun store<CoinType>(): &OftImpl<CoinType> { borrow_global(OAPP_ADDRESS()) }

    // ================================================== Error Codes =================================================

    const EINVALID_ACCOUNT: u64 = 1;
    const ENOT_IMPLEMENTED: u64 = 2;
    const EUNAUTHORIZED: u64 = 3;
}