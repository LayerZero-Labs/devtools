module initia_std::stableswap {
    use std::event::Self;
    use std::signer;
    use std::error;
    use std::vector;
    use std::option::{Self, Option};

    use initia_std::fungible_asset::{Self, FungibleAsset, Metadata};
    use initia_std::block;
    use initia_std::primary_fungible_store;
    use initia_std::object::{Self, ExtendRef, Object};
    use initia_std::bigdecimal::{Self, BigDecimal};
    use initia_std::string::{Self, String};
    use initia_std::coin;
    use initia_std::table::{Self, Table};

    const A_PRECISION: u256 = 100;

    struct ModuleStore has key {
        pools: Table<address, bool>,
        pool_count: u64
    }

    struct Pool has key {
        /// Extend Reference
        extend_ref: ExtendRef,
        /// ANN
        ann: Ann,
        /// swap fee
        swap_fee_rate: BigDecimal,
        /// Coin metadata
        coin_metadata: vector<Object<Metadata>>,
        /// Liqudiity token's burn capability
        burn_cap: coin::BurnCapability,
        /// Liqudiity token's freeze capability
        freeze_cap: coin::FreezeCapability,
        /// Liqudiity token's mint capability
        mint_cap: coin::MintCapability
    }

    #[event]
    struct CreatePoolEvent has drop, store {
        coins: vector<address>,
        liquidity_token: address,
        ann: u64,
        swap_fee_rate: BigDecimal
    }

    #[event]
    struct ProvideEvent has drop, store {
        coins: vector<address>,
        coin_amounts: vector<u64>,
        fee_amounts: vector<u64>,
        liquidity_token: address,
        liquidity: u64
    }

    #[event]
    struct WithdrawEvent has drop, store {
        coins: vector<address>,
        coin_amounts: vector<u64>,
        fee_amounts: vector<u64>,
        liquidity_token: address,
        liquidity: u64
    }

    #[event]
    struct SwapEvent has drop, store {
        offer_coin: address,
        return_coin: address,
        liquidity_token: address,
        offer_amount: u64,
        return_amount: u64,
        fee_amount: u64
    }

    #[event]
    struct UpdateSwapFeeEvent has drop, store {
        liquidity_token: address,
        swap_fee_rate: BigDecimal
    }

    #[event]
    struct UpdateAnnEvent has drop, store {
        liquidity_token: address,
        ann: Ann
    }

    struct Ann has copy, drop, store {
        ann_before: u64,
        ann_after: u64,
        timestamp_before: u64,
        timestamp_after: u64
    }

    struct PoolResponse has copy, drop, store {
        coin_metadata: vector<Object<Metadata>>,
        coin_denoms: vector<String>,
        coin_balances: vector<u64>,
        current_ann: u64,
        swap_fee_rate: BigDecimal
    }

    // Errors

    /// Can not withdraw zero liquidity
    const EZERO_LIQUIDITY: u64 = 2;

    /// Return amount is smaller than the `min_return`
    const EMIN_RETURN: u64 = 3;

    /// Return liquidity amount is smaller than the `min_liquidity_amount`
    const EMIN_LIQUIDITY: u64 = 4;

    /// Returning coin amount of the result of the liquidity withdraw is smaller than min return
    const EMIN_WITHDRAW: u64 = 5;

    /// Base must be in the range of 0 < base < 2
    const EOUT_OF_BASE_RANGE: u64 = 6;

    /// Only chain can execute.
    const EUNAUTHORIZED: u64 = 7;

    /// Fee rate must be smaller than max fee rate
    const EOUT_OF_SWAP_FEE_RATE_RANGE: u64 = 8;

    /// end time must be larger than start time
    const EWEIGHTS_TIMESTAMP: u64 = 9;

    /// Wrong coin type given
    const ECOIN_TYPE: u64 = 10;

    /// Exceed max price impact
    const EPRICE_IMPACT: u64 = 11;

    /// LBP is not started, can not swap yet
    const ELBP_NOT_STARTED: u64 = 14;

    /// LBP is not ended, only swap allowed
    const ELBP_NOT_ENDED: u64 = 15;

    /// LBP start time must be larger than current time
    const ELBP_START_TIME: u64 = 16;

    /// All start_after must be provided or not
    const ESTART_AFTER: u64 = 17;

    const ESAME_COIN_TYPE: u64 = 19;

    const EN_COINS: u64 = 20;

    const EMAX_LIQUIDITY: u64 = 21;

    // Constants
    const MAX_LIMIT: u8 = 30;

    #[view]
    /// Return swap simulation result
    public fun get_swap_simulation(
        pool_obj: Object<Pool>,
        offer_metadata: Object<Metadata>,
        return_metadata: Object<Metadata>,
        offer_amount: u64
    ): u64 acquires Pool {
        let (return_amount, fee_amount) =
            swap_simulation(
                pool_obj,
                offer_metadata,
                return_metadata,
                offer_amount,
                true
            );

        return_amount - fee_amount
    }

    #[view]
    /// Return swap simulation result
    public fun get_swap_simulation_given_out(
        pool_obj: Object<Pool>,
        offer_metadata: Object<Metadata>,
        return_metadata: Object<Metadata>,
        return_amount: u64
    ): u64 acquires Pool {
        let (offer_amount, _) =
            swap_simulation(
                pool_obj,
                offer_metadata,
                return_metadata,
                return_amount,
                false
            );

        offer_amount
    }

    #[view]
    public fun get_swap_simulation_by_denom(
        pool_obj: Object<Pool>,
        offer_denom: String,
        return_denom: String,
        offer_amount: u64
    ): u64 acquires Pool {
        let offer_metadata = coin::denom_to_metadata(offer_denom);
        let return_metadata = coin::denom_to_metadata(return_denom);
        get_swap_simulation(
            pool_obj,
            offer_metadata,
            return_metadata,
            offer_amount
        )
    }

    #[view]
    public fun get_provide_simulation(
        pool_obj: Object<Pool>, coin_amounts: vector<u64>
    ): u64 acquires Pool {
        let (liquidity_amount, _) = provide_simulation(pool_obj, coin_amounts);
        liquidity_amount
    }

    #[view]
    public fun get_imbalance_withdraw_simulation(
        pool_obj: Object<Pool>, coin_amounts: vector<u64>
    ): u64 acquires Pool {
        let (liquidity_amount, _) =
            imbalance_withdraw_simulation(pool_obj, coin_amounts, option::none());
        liquidity_amount
    }

    #[view]
    public fun get_single_asset_withdraw_simulation(
        pool_obj: Object<Pool>,
        return_coin_metadata: Object<Metadata>,
        liquidity_amount: u64
    ): u64 acquires Pool {
        let pool = borrow_pool(pool_obj);

        // get return index
        let (found, return_index) = vector::index_of(
            &pool.coin_metadata, &return_coin_metadata
        );
        assert!(found, error::invalid_argument(ECOIN_TYPE));

        let (liquidity_amount, _) =
            single_asset_withdraw_simulation(pool_obj, liquidity_amount, return_index);
        liquidity_amount
    }

    #[view]
    public fun get_pool(pool: Object<Pool>): PoolResponse acquires Pool {
        let (coin_metadata, coin_balances, current_ann, swap_fee_rate) = pool_info(pool);
        let coin_denoms = vector::map(
            coin_metadata,
            |metadata| coin::metadata_to_denom(metadata)
        );

        PoolResponse {
            coin_metadata,
            coin_denoms,
            coin_balances,
            current_ann,
            swap_fee_rate
        }
    }

    #[view]
    // get all kinds of pool
    // return vector of PoolResponse
    public fun get_all_pools(
        start_after: Option<address>, limit: u8
    ): vector<PoolResponse> acquires ModuleStore, Pool {
        if (limit > MAX_LIMIT) {
            limit = MAX_LIMIT;
        };

        let module_store = borrow_global<ModuleStore>(@initia_std);

        let res = vector[];
        let pools_iter = table::iter(
            &module_store.pools,
            option::none(),
            start_after,
            2
        );

        while (vector::length(&res) < (limit as u64)
            && table::prepare<address, bool>(pools_iter)) {
            let (key, _) = table::next<address, bool>(pools_iter);
            let pool_response = get_pool(object::address_to_object<Pool>(key));
            vector::push_back(&mut res, pool_response)
        };

        res
    }

    #[view]
    public fun spot_price(
        pool_obj: Object<Pool>,
        base_metadata: Object<Metadata>,
        quote_metadata: Object<Metadata>
    ): BigDecimal acquires Pool {
        let pool = borrow_pool(pool_obj);
        let ann = get_current_ann(&pool.ann);
        let pool_addr = object::object_address(&pool_obj);
        let amounts = get_pool_amounts(pool_addr, pool.coin_metadata);
        let d = get_d(amounts, ann);
        let swap_amount = d / 1000;

        if (swap_amount < 1000000) {
            let len = vector::length(&amounts);
            let i = 0;
            while (i < len) {
                let amount = vector::borrow_mut(&mut amounts, i);
                *amount = *amount * 1000000;
                i = i + 1;
            };

            swap_amount = swap_amount * 1000000;
        };

        let (base_return_amount, _) =
            swap_simulation_with_given_amounts(
                pool_obj,
                amounts,
                quote_metadata,
                base_metadata,
                swap_amount,
                true
            );
        let (quote_return_amount, _) =
            swap_simulation_with_given_amounts(
                pool_obj,
                amounts,
                base_metadata,
                quote_metadata,
                swap_amount,
                true
            );

        bigdecimal::from_ratio_u64(
            quote_return_amount + swap_amount,
            base_return_amount + swap_amount
        )
    }

    fun init_module(chain: &signer) {
        move_to(
            chain,
            ModuleStore { pools: table::new(), pool_count: 0 }
        )
    }

    public fun unpack_pool_response(
        pool_response: &PoolResponse
    ): (vector<Object<Metadata>>, vector<String>, vector<u64>, u64, BigDecimal) {
        (
            pool_response.coin_metadata,
            pool_response.coin_denoms,
            pool_response.coin_balances,
            pool_response.current_ann,
            pool_response.swap_fee_rate
        )
    }

    public entry fun create_pool_script(
        creator: &signer,
        name: String,
        symbol: String,
        swap_fee_rate: BigDecimal,
        coin_metadata: vector<Object<Metadata>>,
        coin_amounts: vector<u64>,
        ann: u64
    ) acquires Pool, ModuleStore {
        let coins: vector<FungibleAsset> = vector[];
        let i = 0;
        let n = vector::length(&coin_metadata);
        while (i < n) {
            let metadata = *vector::borrow(&coin_metadata, i);
            let amount = *vector::borrow(&coin_amounts, i);
            vector::push_back(
                &mut coins,
                primary_fungible_store::withdraw(creator, metadata, amount)
            );
            i = i + 1;
        };

        let liquidity_token = create_pool(
            creator, name, symbol, swap_fee_rate, coins, ann
        );
        primary_fungible_store::deposit(signer::address_of(creator), liquidity_token);
    }

    public entry fun update_swap_fee_rate(
        account: &signer, pool_obj: Object<Pool>, new_swap_fee_rate: BigDecimal
    ) acquires Pool {
        check_chain_permission(account);
        let pool = borrow_pool_mut(pool_obj);
        pool.swap_fee_rate = new_swap_fee_rate;

        event::emit(
            UpdateSwapFeeEvent {
                liquidity_token: object::object_address(&pool_obj),
                swap_fee_rate: new_swap_fee_rate
            }
        )
    }

    public entry fun update_ann(
        account: &signer,
        pool_obj: Object<Pool>,
        ann_after: u64,
        timestamp_after: u64
    ) acquires Pool {
        check_chain_permission(account);
        let (_, timestamp) = block::get_block_info();
        let pool = borrow_pool_mut(pool_obj);
        pool.ann.ann_before = get_current_ann(&pool.ann);
        pool.ann.timestamp_before = timestamp;
        pool.ann.ann_after = ann_after;
        pool.ann.timestamp_after = timestamp_after;

        event::emit(
            UpdateAnnEvent {
                liquidity_token: object::object_address(&pool_obj),
                ann: pool.ann
            }
        )
    }

    public entry fun provide_liquidity_script(
        account: &signer,
        pool_obj: Object<Pool>,
        coin_amounts: vector<u64>,
        min_liquidity: Option<u64>
    ) acquires Pool {
        let coins: vector<FungibleAsset> = vector[];
        let pool = borrow_pool(pool_obj);

        let i = 0;
        let n = vector::length(&coin_amounts);
        while (i < n) {
            let metadata = *vector::borrow(&pool.coin_metadata, i);
            let amount = *vector::borrow(&coin_amounts, i);
            vector::push_back(
                &mut coins,
                primary_fungible_store::withdraw(account, metadata, amount)
            );
            i = i + 1;
        };

        let liquidity_token = provide_liquidity(pool_obj, coins, min_liquidity);
        primary_fungible_store::deposit(signer::address_of(account), liquidity_token);
    }

    public entry fun withdraw_liquidity_script(
        account: &signer,
        pool_obj: Object<Pool>,
        liquidity_amount: u64,
        min_return_amounts: vector<Option<u64>>
    ) acquires Pool {
        let liquidity_token =
            primary_fungible_store::withdraw(account, pool_obj, liquidity_amount);
        let coins = withdraw_liquidity(liquidity_token, min_return_amounts);

        let i = 0;
        let n = vector::length(&coins);
        while (i < n) {
            let coin = vector::pop_back(&mut coins);
            primary_fungible_store::deposit(signer::address_of(account), coin);
            i = i + 1;
        };

        vector::destroy_empty(coins);
    }

    public entry fun imbalance_withdraw_liquidity_script(
        account: &signer,
        pool_obj: Object<Pool>,
        coin_amounts: vector<u64>,
        max_liquidity: Option<u64>
    ) acquires Pool {
        let (liquidity_amount, fee_amounts) =
            imbalance_withdraw_simulation(pool_obj, coin_amounts, max_liquidity);
        let liquidity_token =
            primary_fungible_store::withdraw(account, pool_obj, liquidity_amount);
        let pool = borrow_pool(pool_obj);
        let pool_signer = object::generate_signer_for_extending(&pool.extend_ref);
        coin::burn(&pool.burn_cap, liquidity_token);

        let n = vector::length(&pool.coin_metadata);

        let i = 0;
        while (i < n) {
            let coin_metadata = *vector::borrow(&pool.coin_metadata, i);
            let amount = *vector::borrow(&mut coin_amounts, i);
            let coin =
                primary_fungible_store::withdraw(&pool_signer, coin_metadata, amount);
            primary_fungible_store::deposit(signer::address_of(account), coin);
            i = i + 1;
        };

        event::emit<WithdrawEvent>(
            WithdrawEvent {
                coins: get_coin_addresses(pool.coin_metadata),
                coin_amounts,
                fee_amounts,
                liquidity_token: object::object_address(&pool_obj),
                liquidity: liquidity_amount
            }
        );
    }

    public entry fun single_asset_withdraw_liquidity_script(
        account: &signer,
        pool_obj: Object<Pool>,
        return_coin_metadata: Object<Metadata>,
        liquidity_amount: u64,
        min_return_amount: Option<u64>
    ) acquires Pool {
        let liquidity_token =
            primary_fungible_store::withdraw(account, pool_obj, liquidity_amount);
        let return_coin =
            single_asset_withdraw_liquidity(
                liquidity_token,
                return_coin_metadata,
                min_return_amount
            );
        primary_fungible_store::deposit(signer::address_of(account), return_coin);
    }

    public entry fun swap_script(
        account: &signer,
        pool_obj: Object<Pool>,
        offer_coin_metadata: Object<Metadata>,
        return_coin_metadata: Object<Metadata>,
        offer_amount: u64,
        min_return_amount: Option<u64>
    ) acquires Pool {
        let offer_coin =
            primary_fungible_store::withdraw(account, offer_coin_metadata, offer_amount);
        let return_coin =
            swap(
                pool_obj,
                offer_coin,
                return_coin_metadata,
                min_return_amount
            );
        primary_fungible_store::deposit(signer::address_of(account), return_coin);
    }

    fun max_fee_rate(): BigDecimal {
        bigdecimal::from_ratio_u64(1, 100)
    }

    public fun create_pool(
        creator: &signer,
        name: String,
        symbol: String,
        swap_fee_rate: BigDecimal,
        coins: vector<FungibleAsset>,
        ann: u64
    ): FungibleAsset acquires Pool, ModuleStore {
        assert!(
            vector::length(&coins) >= 2,
            error::invalid_argument(EN_COINS)
        );
        let (_, timestamp) = block::get_block_info();
        let (mint_cap, burn_cap, freeze_cap, extend_ref) =
            coin::initialize_and_generate_extend_ref(
                creator,
                option::none(),
                name,
                symbol,
                6,
                string::utf8(b""),
                string::utf8(b"")
            );

        let coin_metadata: vector<Object<Metadata>> = vector[];
        let len = vector::length(&coins);
        let i = 0;
        while (i < len) {
            let j = i + 1;
            let coin_metadata_i =
                fungible_asset::metadata_from_asset(vector::borrow(&coins, i));
            while (j < len) {
                let coin_metadata_j =
                    fungible_asset::metadata_from_asset(vector::borrow(&coins, j));
                assert!(
                    coin_metadata_i != coin_metadata_j,
                    error::invalid_argument(ESAME_COIN_TYPE)
                );
                j = j + 1;
            };
            vector::push_back(&mut coin_metadata, coin_metadata_i);
            i = i + 1;
        };

        assert!(
            bigdecimal::le(swap_fee_rate, max_fee_rate()),
            error::invalid_argument(EOUT_OF_SWAP_FEE_RATE_RANGE)
        );

        let pool_signer = &object::generate_signer_for_extending(&extend_ref);
        let pool_address = signer::address_of(pool_signer);
        // transfer pool object's ownership to initia_std
        object::transfer_raw(creator, pool_address, @initia_std);

        move_to(
            pool_signer,
            Pool {
                extend_ref,
                ann: Ann {
                    ann_before: ann,
                    ann_after: ann,
                    timestamp_before: timestamp,
                    timestamp_after: timestamp
                },
                swap_fee_rate,
                coin_metadata,
                burn_cap,
                freeze_cap,
                mint_cap
            }
        );

        let liquidity_token =
            provide_liquidity(
                object::address_to_object<Pool>(pool_address),
                coins,
                option::none()
            );

        // update module store
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        module_store.pool_count = module_store.pool_count + 1;

        table::add(&mut module_store.pools, pool_address, true);

        // emit create pool event
        event::emit<CreatePoolEvent>(
            CreatePoolEvent {
                coins: get_coin_addresses(coin_metadata),
                liquidity_token: pool_address,
                ann,
                swap_fee_rate
            }
        );

        return liquidity_token
    }

    public fun provide_liquidity(
        pool_obj: Object<Pool>, coins: vector<FungibleAsset>, min_liquidity: Option<u64>
    ): FungibleAsset acquires Pool {
        let pool = borrow_pool(pool_obj);
        // check before simaultion
        let n = check_coin_metadata(&pool.coin_metadata, &coins);
        let amounts = get_amounts(&coins);
        let (liquidity_amount, fee_amounts) = provide_simulation(pool_obj, amounts);

        assert!(
            option::is_none(&min_liquidity)
                || *option::borrow(&min_liquidity) <= liquidity_amount,
            error::invalid_state(EMIN_LIQUIDITY)
        );

        let pool_addr = object::object_address(&pool_obj);
        let i = 0;
        while (i < n) {
            let fa = vector::pop_back(&mut coins);
            primary_fungible_store::deposit(pool_addr, fa);
            i = i + 1;
        };
        vector::destroy_empty(coins);

        let pool = borrow_pool(pool_obj);
        let liquidity_token = coin::mint(&pool.mint_cap, liquidity_amount);

        event::emit<ProvideEvent>(
            ProvideEvent {
                coins: get_coin_addresses(pool.coin_metadata),
                coin_amounts: amounts,
                fee_amounts,
                liquidity_token: pool_addr,
                liquidity: liquidity_amount
            }
        );

        return liquidity_token
    }

    public fun withdraw_liquidity(
        liquidity_token: FungibleAsset, min_return_amounts: vector<Option<u64>>
    ): vector<FungibleAsset> acquires Pool {
        let pool_addr =
            object::object_address(
                &fungible_asset::metadata_from_asset(&liquidity_token)
            );
        let pool_obj = object::address_to_object<Pool>(pool_addr);
        let liquidity_amount = fungible_asset::amount(&liquidity_token);
        assert!(
            liquidity_amount != 0,
            error::invalid_argument(EZERO_LIQUIDITY)
        );
        let pool = borrow_pool(pool_obj);
        let pool_signer = object::generate_signer_for_extending(&pool.extend_ref);
        let total_supply = option::extract(&mut fungible_asset::supply(pool_obj));
        let n = vector::length(&pool.coin_metadata);

        let return_coins: vector<FungibleAsset> = vector[];
        let pool_amounts = get_pool_amounts(pool_addr, pool.coin_metadata);
        let coin_amounts: vector<u64> = vector[];

        let fee_amounts: vector<u64> = vector[];
        let i = 0;
        while (i < n) {
            vector::push_back(&mut fee_amounts, 0);
            let pool_amount = *vector::borrow(&pool_amounts, i);
            let return_amount =
                (
                    mul_div_u128(
                        (pool_amount as u128),
                        (liquidity_amount as u128),
                        total_supply
                    ) as u64
                );
            let min_return = vector::borrow(&min_return_amounts, i);
            let coin_metadata = *vector::borrow(&pool.coin_metadata, i);

            assert!(
                option::is_none(min_return)
                    || *option::borrow(min_return) <= return_amount,
                error::invalid_state(EMIN_WITHDRAW)
            );

            vector::push_back(&mut coin_amounts, return_amount);
            vector::push_back(
                &mut return_coins,
                primary_fungible_store::withdraw(
                    &pool_signer, coin_metadata, return_amount
                )
            );
            i = i + 1;
        };

        coin::burn(&pool.burn_cap, liquidity_token);

        event::emit<WithdrawEvent>(
            WithdrawEvent {
                coins: get_coin_addresses(pool.coin_metadata),
                coin_amounts,
                fee_amounts,
                liquidity_token: pool_addr,
                liquidity: liquidity_amount
            }
        );

        return return_coins
    }

    public fun single_asset_withdraw_liquidity(
        liquidity_token: FungibleAsset,
        return_coin_metadata: Object<Metadata>,
        min_return_amount: Option<u64>
    ): FungibleAsset acquires Pool {
        // get pool infos
        let pool_addr =
            object::object_address(
                &fungible_asset::metadata_from_asset(&liquidity_token)
            );
        let pool_obj = object::address_to_object<Pool>(pool_addr);
        let liquidity_amount = fungible_asset::amount(&liquidity_token);
        assert!(
            liquidity_amount != 0,
            error::invalid_argument(EZERO_LIQUIDITY)
        );

        let pool = borrow_pool(pool_obj);
        let pool_signer = object::generate_signer_for_extending(&pool.extend_ref);
        let n = vector::length(&pool.coin_metadata);

        // get return index
        let (found, return_index) = vector::index_of(
            &pool.coin_metadata, &return_coin_metadata
        );
        assert!(found, error::invalid_argument(ECOIN_TYPE));

        // calculate amount of returning asset
        let (return_amount, fee) =
            single_asset_withdraw_simulation(pool_obj, liquidity_amount, return_index);
        assert!(
            option::is_none(&min_return_amount)
                || *option::borrow(&min_return_amount) <= return_amount,
            error::invalid_state(EMIN_RETURN)
        );

        // withdraw return coin
        let return_coin =
            primary_fungible_store::withdraw(
                &pool_signer,
                return_coin_metadata,
                return_amount
            );

        // burn liquidity token
        let pool = borrow_pool(pool_obj);
        coin::burn(&pool.burn_cap, liquidity_token);

        // generate withdraw/fee amounts for event
        let coin_amounts: vector<u64> = vector[];
        let fee_amounts: vector<u64> = vector[];
        let i = 0;
        while (i < n) {
            let (amount, fee) = if (i == return_index) {
                (return_amount, fee)
            } else { (0, 0) };
            vector::push_back(&mut coin_amounts, amount);
            vector::push_back(&mut fee_amounts, fee);
            i = i + 1;
        };

        // emit withdraw event
        event::emit<WithdrawEvent>(
            WithdrawEvent {
                coins: get_coin_addresses(pool.coin_metadata),
                coin_amounts,
                fee_amounts,
                liquidity_token: pool_addr,
                liquidity: liquidity_amount
            }
        );

        return_coin
    }

    public fun swap(
        pool_obj: Object<Pool>,
        offer_coin: FungibleAsset,
        return_coin_metadata: Object<Metadata>,
        min_return_amount: Option<u64>
    ): FungibleAsset acquires Pool {
        let offer_coin_metadata = fungible_asset::metadata_from_asset(&offer_coin);
        let offer_amount = fungible_asset::amount(&offer_coin);
        let (return_amount, fee_amount) =
            swap_simulation(
                pool_obj,
                offer_coin_metadata,
                return_coin_metadata,
                offer_amount,
                true
            );
        return_amount = return_amount - fee_amount;

        assert!(
            option::is_none(&min_return_amount)
                || *option::borrow(&min_return_amount) <= return_amount,
            error::invalid_state(EMIN_RETURN)
        );

        let pool = borrow_pool(pool_obj);
        let pool_addr = object::object_address(&pool_obj);
        let pool_signer = object::generate_signer_for_extending(&pool.extend_ref);
        primary_fungible_store::deposit(pool_addr, offer_coin);
        let return_coin =
            primary_fungible_store::withdraw(
                &pool_signer,
                return_coin_metadata,
                return_amount
            );

        event::emit<SwapEvent>(
            SwapEvent {
                offer_coin: object::object_address(&offer_coin_metadata),
                return_coin: object::object_address(&return_coin_metadata),
                liquidity_token: pool_addr,
                fee_amount,
                offer_amount,
                return_amount
            }
        );

        return return_coin
    }

    public fun pool_info(
        pool_obj: Object<Pool>
    ): (vector<Object<Metadata>>, vector<u64>, u64, BigDecimal) acquires Pool {
        let pool_addr = object::object_address(&pool_obj);
        let pool = borrow_global<Pool>(pool_addr);

        let ann = get_current_ann(&pool.ann);
        let pool_amounts = get_pool_amounts(pool_addr, pool.coin_metadata);

        (pool.coin_metadata, pool_amounts, ann, pool.swap_fee_rate)
    }

    inline fun borrow_pool(pool_obj: Object<Pool>): &Pool {
        borrow_global<Pool>(object::object_address(&pool_obj))
    }

    inline fun borrow_pool_mut(pool_obj: Object<Pool>): &mut Pool {
        borrow_global_mut<Pool>(object::object_address(&pool_obj))
    }

    fun get_current_ann(ann: &Ann): u64 {
        let (_, timestamp) = block::get_block_info();

        if (timestamp >= ann.timestamp_after) {
            return ann.ann_after
        };

        if (ann.ann_after > ann.ann_before) {
            return ann.ann_before
                + (ann.ann_after - ann.ann_before) * (timestamp - ann.timestamp_before)
                    / (ann.timestamp_after - ann.timestamp_before)
        } else {
            return ann.ann_before
                - (ann.ann_before - ann.ann_after) * (timestamp - ann.timestamp_before)
                    / (ann.timestamp_after - ann.timestamp_before)
        }
    }

    fun check_coin_metadata(
        coin_metadata: &vector<Object<Metadata>>, coins: &vector<FungibleAsset>
    ): u64 {
        let len = vector::length(coin_metadata);
        assert!(
            len == vector::length(coins),
            error::invalid_argument(EN_COINS)
        );

        let i = 0;
        while (i < len) {
            let metadata = vector::borrow(coin_metadata, i);
            let metadata_ = fungible_asset::metadata_from_asset(
                vector::borrow(coins, i)
            );
            assert!(
                *metadata == metadata_,
                error::invalid_argument(ECOIN_TYPE)
            );
            i = i + 1;
        };

        return len
    }

    fun get_pool_amounts(
        pool_addr: address, coin_metadata: vector<Object<Metadata>>
    ): vector<u64> {
        let amounts: vector<u64> = vector[];
        let len = vector::length(&coin_metadata);
        let i = 0;
        while (i < len) {
            let metadata = *vector::borrow(&coin_metadata, i);
            vector::push_back(
                &mut amounts,
                primary_fungible_store::balance(pool_addr, metadata)
            );
            i = i + 1;
        };

        return amounts
    }

    fun get_amounts(coins: &vector<FungibleAsset>): vector<u64> {
        let amounts: vector<u64> = vector[];
        let len = vector::length(coins);
        let i = 0;
        while (i < len) {
            let amount = fungible_asset::amount(vector::borrow(coins, i));
            vector::push_back(&mut amounts, amount);
            i = i + 1;
        };

        return amounts
    }

    fun get_coin_addresses(coin_metadata: vector<Object<Metadata>>): vector<address> {
        let addresses: vector<address> = vector[];
        let len = vector::length(&coin_metadata);
        let i = 0;
        while (i < len) {
            let addr = object::object_address(&*vector::borrow(&coin_metadata, i));
            vector::push_back(&mut addresses, addr);
            i = i + 1;
        };

        return addresses
    }

    fun get_d(amounts: vector<u64>, ann: u64): u64 {
        let ann = (ann as u256);

        let sum: u256 = 0;
        let n = (vector::length(&amounts) as u256);
        let i = 0;
        while (i < (n as u64)) {
            sum = sum + (*vector::borrow(&amounts, i) as u256);
            i = i + 1;
        };
        if (sum == 0) return 0;
        let d = sum;

        let i = 0;

        // converge
        // d = (ann * sum - d_prod) / (ann - 1)
        while (i < 255) {
            let d_prev = d;
            // D ** (n + 1) / (n ** n * prod)
            let d_prod = d;
            let j = 0;
            while (j < (n as u64)) {
                d_prod = d_prod * d / (n as u256)
                    / (*vector::borrow(&amounts, j) as u256);
                j = j + 1;
            };

            d = (ann * sum / A_PRECISION + d_prod * n) * d
                / ((ann - A_PRECISION) * d / A_PRECISION + (n + 1) * d_prod);
            if (d > d_prev) {
                if (d - d_prev <= 1) break
            } else {
                if (d_prev - d <= 1) break
            };
            i = i + 1;
        };

        return (d as u64)
    }

    /// get counterparty's amount
    fun get_y(
        offer_index: u64,
        return_index: u64,
        amount: u64,
        pool_amounts: vector<u64>,
        ann: u64,
        is_offer_amount: bool
    ): u64 {
        let d = get_d(pool_amounts, ann);

        let y_index =
            if (is_offer_amount) {
                let pool_amount = vector::borrow_mut(&mut pool_amounts, offer_index);
                *pool_amount = *pool_amount + amount;
                return_index
            } else {
                let pool_amount = vector::borrow_mut(&mut pool_amounts, return_index);
                *pool_amount = *pool_amount - amount;
                offer_index
            };

        get_y_with_given_d(pool_amounts, y_index, ann, d)
    }

    fun get_y_with_given_d(
        pool_amounts: vector<u64>,
        y_index: u64,
        ann: u64,
        d: u64
    ): u64 {
        let d = (d as u256);
        let ann = (ann as u256);
        // Done by solving quadratic equation iteratively.
        // x_1**2 + x_1 * (sum' - (A*n**n - 1) * D / (A * n**n)) = D ** (n + 1) / (n ** (2 * n) * prod' * A)
        // y**2 + b*y = c

        // y = (y**2 + c) / (2*y + b)
        let n = vector::length(&pool_amounts);
        let i = 0;
        let sum = 0; // sum'
        let c = d;
        while (i < n) {
            if (i == y_index) {
                i = i + 1;
                continue
            };

            let pool_amount = (*vector::borrow(&pool_amounts, i) as u256);

            sum = sum + pool_amount;
            c = c * d / (pool_amount * (n as u256));
            i = i + 1;
        };

        c = c * d * A_PRECISION / ann / (n as u256);
        let b_plus_d = sum + d * A_PRECISION / ann; // need to sub d but sub later due to value must be less than 0

        let y_prev;
        let y = d;

        let i = 0;
        // converge
        while (i < 255) {
            y_prev = y;
            y = (y * y + c) / (2 * y + b_plus_d - d); // sub d here

            if (y > y_prev) {
                if (y - y_prev <= 1) break
            } else {
                if (y_prev - y <= 1) break
            };
            i = i + 1;
        };

        (y as u64)
    }

    public fun single_asset_withdraw_simulation(
        pool_obj: Object<Pool>, liquidity_amount: u64, return_index: u64
    ): (u64, u64) acquires Pool {
        let pool_addr = object::object_address(&pool_obj);
        let pool = borrow_global<Pool>(pool_addr);
        let n = vector::length(&pool.coin_metadata);
        let ann = get_current_ann(&pool.ann);
        let withdraw_fee_rate =
            bigdecimal::div_by_u64(
                bigdecimal::mul_by_u64(pool.swap_fee_rate, n),
                4 * (n - 1)
            );
        let total_supply = option::extract(&mut fungible_asset::supply(pool_obj));
        let pool_amounts = get_pool_amounts(pool_addr, pool.coin_metadata);
        let d_before = get_d(pool_amounts, ann);
        let d_after =
            d_before
                - (
                    mul_div_u128(
                        (liquidity_amount as u128),
                        (d_before as u128),
                        total_supply
                    ) as u64
                );

        let y_without_fee = get_y_with_given_d(pool_amounts, return_index, ann, d_after);
        let return_amount_without_fee =
            *vector::borrow(&pool_amounts, return_index) - y_without_fee;

        // calculate fee

        // amount that after fee removed
        let pool_amounts_reduced = pool_amounts;
        let i = 0;
        while (i < n) {
            // get difference with ideal amount
            let amount_diff =
                if (i == return_index) {
                    mul_div_u64(
                        *vector::borrow(&pool_amounts, i),
                        d_after,
                        d_before
                    ) - y_without_fee
                } else {
                    *vector::borrow(&pool_amounts, i)
                        - mul_div_u64(
                            *vector::borrow(&pool_amounts, i),
                            d_after,
                            d_before
                        )
                };

            let pool_amount = vector::borrow_mut(&mut pool_amounts_reduced, i);
            *pool_amount = *pool_amount
                - bigdecimal::mul_by_u64_truncate(withdraw_fee_rate, amount_diff);
            i = i + 1;
        };

        let return_amount =
            *vector::borrow(&pool_amounts_reduced, return_index)
                - get_y_with_given_d(
                    pool_amounts_reduced,
                    return_index,
                    ann,
                    d_after
                ) - 1; // sub 1 in case of rounding errors

        (return_amount, return_amount_without_fee - return_amount)
    }

    public fun imbalance_withdraw_simulation(
        pool_obj: Object<Pool>,
        coin_amounts: vector<u64>,
        max_liquidity_amount: Option<u64>
    ): (u64, vector<u64>) acquires Pool {
        let pool_addr = object::object_address(&pool_obj);
        let pool = borrow_global<Pool>(pool_addr);
        let n = vector::length(&pool.coin_metadata);
        let ann = get_current_ann(&pool.ann);
        let withdraw_fee_rate =
            bigdecimal::div_by_u64(
                bigdecimal::mul_by_u64(pool.swap_fee_rate, n),
                4 * (n - 1)
            );
        let total_supply = option::extract(&mut fungible_asset::supply(pool_obj));

        assert!(
            n == vector::length(&coin_amounts),
            error::invalid_argument(EN_COINS)
        );

        let pool_amounts_before = get_pool_amounts(pool_addr, pool.coin_metadata);
        let pool_amounts_after = copy pool_amounts_before;
        let d_before = get_d(pool_amounts_before, ann);

        // update pool amounts after withdraw
        let i = 0;
        while (i < n) {
            let pool_amount = vector::borrow_mut(&mut pool_amounts_after, i);
            let withdraw_amount = *vector::borrow(&coin_amounts, i);
            *pool_amount = *pool_amount - withdraw_amount;
            i = i + 1;
        };

        let d_after_without_fee = get_d(pool_amounts_after, ann);

        let fees: vector<u64> = vector[];

        // calculate fee
        let i = 0;
        while (i < n) {
            let ideal_balance =
                mul_div_u64(
                    *vector::borrow(&pool_amounts_before, i),
                    d_after_without_fee,
                    d_before
                );
            let balance_after = vector::borrow_mut(&mut pool_amounts_after, i);
            let amount_diff =
                if (*balance_after > ideal_balance) {
                    *balance_after - ideal_balance
                } else {
                    ideal_balance - *balance_after
                };
            let fee = bigdecimal::mul_by_u64_ceil(withdraw_fee_rate, amount_diff);
            vector::push_back(&mut fees, fee);
            *balance_after = *balance_after - fee; // to get d_after remove fee
            i = i + 1;
        };

        let d_after = get_d(pool_amounts_after, ann);
        let liquidity_amount =
            (
                mul_div_u128(
                    total_supply,
                    (d_before - d_after as u128),
                    (d_before as u128)
                ) as u64
            );
        assert!(
            liquidity_amount != 0,
            error::invalid_state(EZERO_LIQUIDITY)
        );
        liquidity_amount = liquidity_amount + 1; // add 1 just in case of rounding errors

        assert!(
            option::is_none(&max_liquidity_amount)
                || *option::borrow(&max_liquidity_amount) >= liquidity_amount,
            error::invalid_state(EMAX_LIQUIDITY)
        );

        (liquidity_amount, fees)
    }

    public fun swap_simulation(
        pool_obj: Object<Pool>,
        offer_coin_metadata: Object<Metadata>,
        return_coin_metadata: Object<Metadata>,
        amount: u64,
        is_offer_amount: bool
    ): (u64, u64) acquires Pool {
        let pool = borrow_pool(pool_obj);
        let pool_addr = object::object_address(&pool_obj);
        let pool_amounts = get_pool_amounts(pool_addr, pool.coin_metadata);
        swap_simulation_with_given_amounts(
            pool_obj,
            pool_amounts,
            offer_coin_metadata,
            return_coin_metadata,
            amount,
            is_offer_amount
        )
    }

    public fun provide_simulation(
        pool_obj: Object<Pool>, amounts: vector<u64>
    ): (u64, vector<u64>) acquires Pool {
        let pool = borrow_pool(pool_obj);
        let pool_addr = object::object_address(&pool_obj);
        let ann = get_current_ann(&pool.ann);

        let pool_amounts_before = get_pool_amounts(pool_addr, pool.coin_metadata);
        let d_before = get_d(pool_amounts_before, ann);
        let total_supply = option::extract(&mut fungible_asset::supply(pool_obj));
        let n = vector::length(&amounts);

        // pool amounts before adjust fee
        let pool_amounts_after: vector<u64> = vector[];
        let i = 0;
        while (i < n) {
            let pool_amount = *vector::borrow(&pool_amounts_before, i);
            let offer_amount = *vector::borrow(&amounts, i);
            if (total_supply == 0) {
                assert!(
                    offer_amount > 0,
                    error::invalid_argument(EZERO_LIQUIDITY)
                );
            };
            vector::push_back(
                &mut pool_amounts_after,
                pool_amount + offer_amount
            );
            i = i + 1;
        };

        let d_ideal = get_d(pool_amounts_after, ann);
        let fee_amounts: vector<u64> = vector[];

        // calc fees
        let liquidity_amount =
            if (total_supply > 0) {
                let provide_fee_rate =
                    bigdecimal::div_by_u64(
                        bigdecimal::mul_by_u64(pool.swap_fee_rate, n),
                        4 * (n - 1)
                    );
                i = 0;
                while (i < n) {
                    let pool_amount_before = *vector::borrow(&pool_amounts_before, i);
                    let pool_amount_after = vector::borrow_mut(
                        &mut pool_amounts_after, i
                    );
                    let ideal_balance = mul_div_u64(
                        d_ideal, pool_amount_before, d_before
                    );
                    let diff =
                        if (ideal_balance > *pool_amount_after) {
                            ideal_balance - *pool_amount_after
                        } else {
                            *pool_amount_after - ideal_balance
                        };
                    let fee = bigdecimal::mul_by_u64_ceil(provide_fee_rate, diff);
                    vector::push_back(&mut fee_amounts, fee);
                    *pool_amount_after = *pool_amount_after - fee;
                    i = i + 1;
                };

                let d_real = get_d(pool_amounts_after, ann);
                (
                    mul_div_u128(
                        total_supply,
                        (d_real - d_before as u128),
                        (d_before as u128)
                    ) as u64
                )
            } else {
                d_ideal
            };

        (liquidity_amount, fee_amounts)
    }

    fun swap_simulation_with_given_amounts(
        pool_obj: Object<Pool>,
        pool_amounts: vector<u64>,
        offer_coin_metadata: Object<Metadata>,
        return_coin_metadata: Object<Metadata>,
        amount: u64,
        is_offer_amount: bool
    ): (u64, u64) acquires Pool {
        assert!(
            offer_coin_metadata != return_coin_metadata,
            error::invalid_argument(ESAME_COIN_TYPE)
        );
        let pool = borrow_pool(pool_obj);
        let n = vector::length(&pool.coin_metadata);

        let ann = get_current_ann(&pool.ann);
        let offer_index = n;
        let return_index = n;
        let i = 0;
        while (i < n) {
            let metadata = *vector::borrow(&pool.coin_metadata, i);
            if (metadata == offer_coin_metadata) {
                offer_index = i
            };
            if (metadata == return_coin_metadata) {
                return_index = i
            };
            if (offer_index != n && return_index != n) { break };
            i = i + 1;
        };

        assert!(
            offer_index != n && return_index != n,
            error::invalid_argument(ECOIN_TYPE)
        );

        if (!is_offer_amount) {
            amount = amount + 1; // for revert sub 1 when get return amount

            // adjust fee. amount = amount * 1 / (1 - f)
            let return_amount =
                bigdecimal::truncate_u64(
                    bigdecimal::div(
                        bigdecimal::from_u64(amount),
                        bigdecimal::sub(bigdecimal::one(), pool.swap_fee_rate)
                    )
                );
            let fee_amount = return_amount - amount;

            let y =
                get_y(
                    offer_index,
                    return_index,
                    return_amount,
                    pool_amounts,
                    ann,
                    is_offer_amount
                );
            let offer_amount = y - *vector::borrow(&pool_amounts, offer_index);

            (offer_amount, fee_amount)
        } else {
            let y =
                get_y(
                    offer_index,
                    return_index,
                    amount,
                    pool_amounts,
                    ann,
                    is_offer_amount
                );

            let return_amount = *vector::borrow(&pool_amounts, return_index) - y - 1; // sub 1 in case of rounding errors
            let fee_amount =
                bigdecimal::mul_by_u64_ceil(pool.swap_fee_rate, return_amount);

            (return_amount, fee_amount)
        }
    }

    fun mul_div_u64(a: u64, b: u64, c: u64): u64 {
        return ((a as u128) * (b as u128) / (c as u128) as u64)
    }

    fun mul_div_u128(a: u128, b: u128, c: u128): u128 {
        return ((a as u256) * (b as u256) / (c as u256) as u128)
    }

    /// Check signer is chain
    fun check_chain_permission(chain: &signer) {
        assert!(
            signer::address_of(chain) == @initia_std,
            error::permission_denied(EUNAUTHORIZED)
        );
    }

    #[test_only]
    public fun init_module_for_test() {
        init_module(&initia_std::account::create_signer_for_test(@initia_std))
    }

    #[test_only]
    fun initialized_coin(
        account: &signer, symbol: String
    ): (coin::BurnCapability, coin::FreezeCapability, coin::MintCapability) {
        let (mint_cap, burn_cap, freeze_cap, _) =
            coin::initialize_and_generate_extend_ref(
                account,
                option::none(),
                string::utf8(b""),
                symbol,
                6,
                string::utf8(b""),
                string::utf8(b"")
            );

        return (burn_cap, freeze_cap, mint_cap)
    }

    #[test(chain = @0x1)]
    fun end_to_end(chain: signer) acquires ModuleStore, Pool {
        init_module(&chain);
        initia_std::primary_fungible_store::init_module_for_test();

        let chain_addr = signer::address_of(&chain);
        let (_, _, a_mint_cap) = initialized_coin(&chain, string::utf8(b"a"));
        let (_, _, b_mint_cap) = initialized_coin(&chain, string::utf8(b"b"));
        coin::mint_to(&a_mint_cap, chain_addr, 1000000000);
        coin::mint_to(&b_mint_cap, chain_addr, 1000000000);
        let metadata_a = coin::metadata(chain_addr, string::utf8(b"a"));
        let metadata_b = coin::metadata(chain_addr, string::utf8(b"b"));
        create_pool_script(
            &chain,
            string::utf8(b"lp"),
            string::utf8(b"lp"),
            bigdecimal::from_ratio_u64(5, 10000),
            vector[metadata_a, metadata_b],
            vector[100000000, 100000000],
            6000
        );
        let metadata_lp = coin::metadata(chain_addr, string::utf8(b"lp"));
        let pool = object::convert<Metadata, Pool>(metadata_lp);

        assert!(
            coin::balance(chain_addr, metadata_lp) == 200000000,
            0
        );
        assert!(
            coin::balance(chain_addr, metadata_a) == 900000000,
            0
        );
        assert!(
            coin::balance(chain_addr, metadata_b) == 900000000,
            0
        );
        provide_liquidity_script(
            &chain,
            pool,
            vector[100000000, 100000000],
            option::none()
        );
        assert!(
            coin::balance(chain_addr, metadata_lp) == 400000000,
            1
        );
        assert!(
            coin::balance(chain_addr, metadata_a) == 800000000,
            1
        );
        assert!(
            coin::balance(chain_addr, metadata_b) == 800000000,
            1
        );
        withdraw_liquidity_script(
            &chain,
            pool,
            200000000,
            vector[option::none(), option::none()]
        );
        assert!(
            coin::balance(chain_addr, metadata_lp) == 200000000,
            2
        );
        assert!(
            coin::balance(chain_addr, metadata_a) == 900000000,
            2
        );
        assert!(
            coin::balance(chain_addr, metadata_b) == 900000000,
            2
        );

        let offer_coin = coin::withdraw(&chain, metadata_a, 1000000);
        let return_coin = swap(pool, offer_coin, metadata_b, option::none());
        let return_amount = fungible_asset::amount(&return_coin);
        assert!(return_amount == 999177, 3);

        coin::deposit(chain_addr, return_coin);
    }

    #[test(chain = @0x1)]
    fun single_asset_withdraw_test(chain: signer) acquires ModuleStore, Pool {
        init_module(&chain);
        initia_std::primary_fungible_store::init_module_for_test();

        let chain_addr = signer::address_of(&chain);
        let (_, _, a_mint_cap) = initialized_coin(&chain, string::utf8(b"a"));
        let (_, _, b_mint_cap) = initialized_coin(&chain, string::utf8(b"b"));
        coin::mint_to(&a_mint_cap, chain_addr, 1000000000);
        coin::mint_to(&b_mint_cap, chain_addr, 1000000000);
        let metadata_a = coin::metadata(chain_addr, string::utf8(b"a"));
        let metadata_b = coin::metadata(chain_addr, string::utf8(b"b"));
        create_pool_script(
            &chain,
            string::utf8(b"lp"),
            string::utf8(b"lp"),
            bigdecimal::zero(),
            vector[metadata_a, metadata_b],
            vector[100000000, 100000000],
            6000
        );

        let metadata_lp = coin::metadata(chain_addr, string::utf8(b"lp"));
        let pool = object::convert<Metadata, Pool>(metadata_lp);

        let liquidity_before = coin::balance(chain_addr, metadata_lp);
        provide_liquidity_script(
            &chain,
            pool,
            vector[100000000, 0],
            option::none()
        );
        let liquidity_after = coin::balance(chain_addr, metadata_lp);

        single_asset_withdraw_liquidity_script(
            &chain,
            pool,
            metadata_a,
            liquidity_after - liquidity_before,
            option::none()
        );

        // theoretically it should be 100000000, 100000000 but reduce 1 from return amount because of rounding error
        assert!(
            get_pool(pool).coin_balances == vector[100000001, 100000000],
            0
        );
    }

    #[test(chain = @0x1)]
    fun imbalance_withdraw_test(chain: signer) acquires ModuleStore, Pool {
        init_module(&chain);
        initia_std::primary_fungible_store::init_module_for_test();

        let chain_addr = signer::address_of(&chain);
        let (_, _, a_mint_cap) = initialized_coin(&chain, string::utf8(b"a"));
        let (_, _, b_mint_cap) = initialized_coin(&chain, string::utf8(b"b"));
        coin::mint_to(&a_mint_cap, chain_addr, 1000000000);
        coin::mint_to(&b_mint_cap, chain_addr, 1000000000);
        let metadata_a = coin::metadata(chain_addr, string::utf8(b"a"));
        let metadata_b = coin::metadata(chain_addr, string::utf8(b"b"));
        create_pool_script(
            &chain,
            string::utf8(b"lp"),
            string::utf8(b"lp"),
            bigdecimal::zero(),
            vector[metadata_a, metadata_b],
            vector[100000000, 100000000],
            6000
        );

        let metadata_lp = coin::metadata(chain_addr, string::utf8(b"lp"));
        let pool = object::convert<Metadata, Pool>(metadata_lp);

        let liquidity_before = coin::balance(chain_addr, metadata_lp);
        provide_liquidity_script(
            &chain,
            pool,
            vector[100000000, 50000000],
            option::none()
        );

        imbalance_withdraw_liquidity_script(
            &chain,
            pool,
            vector[100000000, 50000000],
            option::none()
        );

        let liquidity_after = coin::balance(chain_addr, metadata_lp);

        // theoretically it should be same but reduce 1 from return amount because of rounding error
        assert!(liquidity_before == liquidity_after + 1, 0);
    }
}
