module initia_std::staking {
    use std::string::String;
    use std::signer;
    use std::error;
    use std::vector;
    use std::option::{Self, Option};

    use initia_std::account::create_signer;
    use initia_std::block;
    use initia_std::cosmos;
    use initia_std::event;
    use initia_std::primary_fungible_store;
    use initia_std::object::{Self, Object, ExtendRef};
    use initia_std::fungible_asset::{Self, Metadata, FungibleStore, FungibleAsset};
    use initia_std::table::{Self, Table};
    use initia_std::bigdecimal::{Self, BigDecimal};
    use initia_std::coin;
    use initia_std::string;

    struct ModuleStore has key {
        staking_states: Table<Object<Metadata>, Table<String, StakingState>>
    }

    struct StakingState has store {
        metadata: Object<Metadata>,
        validator: String,
        total_share: BigDecimal,
        unbonding_share: BigDecimal,
        reward_index: BigDecimal,
        reward_coin_store_ref: ExtendRef,
        unbonding_coin_store_ref: ExtendRef,
        reward_coin_store: Object<FungibleStore>,
        unbonding_coin_store: Object<FungibleStore>
    }

    /// Define a delegation entry which can be transferred.
    struct Delegation has store {
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal,
        reward_index: BigDecimal
    }

    /// Define a unbonding entry which can be transferred.
    struct Unbonding has store {
        metadata: Object<Metadata>,
        validator: String,
        unbonding_share: BigDecimal,
        release_time: u64
    }

    /// A holder of delegations and unbonding delegations.
    /// These are kept in a single resource to ensure locality of data.
    struct DelegationStore has key {
        // key: metadata + validator
        delegations: Table<Object<Metadata>, Table<String, Delegation>>,
        // key: metadata + validator + release_times
        unbondings: Table<Object<Metadata>, Table<UnbondingKey, Unbonding>>
    }

    // Keys

    /// Key for `Unbonding`
    struct UnbondingKey has copy, drop {
        validator: String,
        release_time: u64
    }

    // Events

    #[event]
    /// Event emitted when some amount of reward is claimed by entry function.
    struct RewardEvent has drop, store {
        account: address,
        metadata: Object<Metadata>,
        amount: u64
    }

    #[event]
    /// Event emitted when a Delegation is deposited to an account.
    struct DelegationDepositEvent has drop, store {
        account: address,
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal
    }

    #[event]
    /// Event emitted when a Delegation is withdrawn from an account.
    struct DelegationWithdrawEvent has drop, store {
        account: address,
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal
    }

    #[event]
    /// Event emitted when a Unbonding is deposited from an account.
    struct UnbondingDepositEvent has drop, store {
        account: address,
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal,
        release_time: u64
    }

    #[event]
    /// Event emitted when a Unbonding is withdrawn from an account.
    struct UnbondingWithdrawEvent has drop, store {
        account: address,
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal,
        release_time: u64
    }

    // Query responses

    struct DelegationResponse has drop {
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal,
        unclaimed_reward: u64
    }

    struct UnbondingResponse has drop {
        metadata: Object<Metadata>,
        validator: String,
        unbonding_amount: u64,
        release_time: u64
    }

    // Errors

    /// triggered when delegation store is already exists.
    const EDELEGATION_STORE_ALREADY_EXISTS: u64 = 1;

    /// triggered when delegation store is not exists.
    const EDELEGATION_STORE_NOT_EXISTS: u64 = 2;

    /// triggered when the chain operations are triggered by others.
    const EUNAUTHORIZED_CHAIN_OPERATION: u64 = 3;

    //// triggered when a staking state is not exists.
    const ESTAKING_STATE_NOT_EXISTS: u64 = 4;

    /// triggered when the given arguments have different metadata.
    const EMETADATA_MISMATCH: u64 = 5;

    /// triggered when a total share is smaller than a withdrawing share.
    const EINSUFFICIENT_UNBONDING_DELEGATION_TOTAL_SHARE: u64 = 6;

    /// triggered when a non-empty delegation or unbonding is passed to destroy.
    const ENOT_EMPTY: u64 = 7;

    /// Validator of delegation which is used as operand doesn't match the other operand one
    const EVALIDATOR_MISMATCH: u64 = 8;

    /// `release_time` of the `source_unbonding` must be sooner than or equal to the one of `dst_unbonding`
    const ERELEASE_TIME: u64 = 9;

    /// Can not claim before `release_time`
    const ENOT_RELEASED: u64 = 10;

    /// Insufficient amount or share
    const EINSUFFICIENT_AMOUNT: u64 = 11;

    /// Can not find unbonding
    const EUNBONDING_NOT_FOUND: u64 = 12;

    /// Can not find delegation
    const EDELEGATION_NOT_FOUND: u64 = 13;

    /// Both `start_after_validator` and `start_after_release_time` either given or not given.
    const EINVALID_START_AFTER: u64 = 14;

    /// Length of validators and amounts mismatch.
    const ELENGTH_MISMATCH: u64 = 15;

    /// Chain already has `StakingState` for the given metadata
    const ESTAKING_STATE_ALREADY_EXISTS: u64 = 16;

    /// Invalid slash fraction
    const EINVALID_SLASH_FRACTION: u64 = 17;

    // Constants

    /// Max number of view function response items.
    const MAX_LIMIT: u8 = 30;

    /// `uinit` token symbol bytes
    const REWARD_SYMBOL: vector<u8> = b"uinit";

    public fun reward_metadata(): Object<Metadata> {
        coin::metadata(@initia_std, string::utf8(REWARD_SYMBOL))
    }

    // Module initialization

    fun init_module(chain: &signer) {
        move_to(
            chain,
            ModuleStore { staking_states: table::new() }
        );
    }

    // Helper functions

    fun load_staking_state(
        staking_states: &Table<Object<Metadata>, Table<String, StakingState>>,
        metadata: Object<Metadata>,
        validator: String
    ): &StakingState {
        assert!(
            table::contains(staking_states, metadata),
            error::not_found(ESTAKING_STATE_NOT_EXISTS)
        );
        let states = table::borrow(staking_states, metadata);

        assert!(
            table::contains(states, validator),
            error::not_found(ESTAKING_STATE_NOT_EXISTS)
        );
        table::borrow(states, validator)
    }

    fun load_staking_state_mut(
        staking_states: &mut Table<Object<Metadata>, Table<String, StakingState>>,
        metadata: Object<Metadata>,
        validator: String
    ): &mut StakingState {
        assert!(
            table::contains(staking_states, metadata),
            error::not_found(ESTAKING_STATE_NOT_EXISTS)
        );
        let states = table::borrow_mut(staking_states, metadata);

        assert!(
            table::contains(states, validator),
            error::not_found(ESTAKING_STATE_NOT_EXISTS)
        );
        table::borrow_mut(states, validator)
    }

    fun load_delegation(
        delegations: &Table<Object<Metadata>, Table<String, Delegation>>,
        metadata: Object<Metadata>,
        validator: String
    ): &Delegation {
        assert!(
            table::contains(delegations, metadata),
            error::not_found(EDELEGATION_NOT_FOUND)
        );
        let delegations = table::borrow(delegations, metadata);

        assert!(
            table::contains(delegations, validator),
            error::not_found(EDELEGATION_NOT_FOUND)
        );
        table::borrow(delegations, validator)
    }

    fun load_delegation_mut(
        delegations: &mut Table<Object<Metadata>, Table<String, Delegation>>,
        metadata: Object<Metadata>,
        validator: String
    ): &mut Delegation {
        assert!(
            table::contains(delegations, metadata),
            error::not_found(EDELEGATION_NOT_FOUND)
        );
        let delegations = table::borrow_mut(delegations, metadata);

        assert!(
            table::contains(delegations, validator),
            error::not_found(EDELEGATION_NOT_FOUND)
        );
        table::borrow_mut(delegations, validator)
    }

    fun load_unbonding(
        unbondings: &Table<Object<Metadata>, Table<UnbondingKey, Unbonding>>,
        metadata: Object<Metadata>,
        validator: String,
        release_time: u64
    ): &Unbonding {
        assert!(
            table::contains(unbondings, metadata),
            error::not_found(EUNBONDING_NOT_FOUND)
        );
        let unbondings = table::borrow(unbondings, metadata);

        let key = UnbondingKey { validator, release_time };
        assert!(
            table::contains(unbondings, key),
            error::not_found(EUNBONDING_NOT_FOUND)
        );
        table::borrow(unbondings, key)
    }

    fun load_unbonding_mut(
        unbondings: &mut Table<Object<Metadata>, Table<UnbondingKey, Unbonding>>,
        metadata: Object<Metadata>,
        validator: String,
        release_time: u64
    ): &mut Unbonding {
        assert!(
            table::contains(unbondings, metadata),
            error::not_found(EUNBONDING_NOT_FOUND)
        );
        let unbondings = table::borrow_mut(unbondings, metadata);

        let key = UnbondingKey { validator, release_time };
        assert!(
            table::contains(unbondings, key),
            error::not_found(EUNBONDING_NOT_FOUND)
        );
        table::borrow_mut(unbondings, key)
    }

    // View functions

    /// util function to convert Delegation => DelegationResponse for third party queriers
    public fun get_delegation_response_from_delegation(
        delegation: &Delegation
    ): DelegationResponse acquires ModuleStore {
        let metadata = delegation.metadata;
        let validator = delegation.validator;

        let module_store = borrow_global<ModuleStore>(@initia_std);
        let state = load_staking_state(
            &module_store.staking_states,
            metadata,
            validator
        );

        let reward = calculate_reward(delegation, state);

        DelegationResponse {
            metadata: delegation.metadata,
            validator: delegation.validator,
            share: delegation.share,
            unclaimed_reward: reward
        }
    }

    /// util function to convert Unbonding => UnbondingResponse for third party queriers
    public fun get_unbonding_response_from_unbonding(
        unbonding: &Unbonding
    ): UnbondingResponse acquires ModuleStore {
        let unbonding_amount = get_unbonding_amount_from_unbonding(unbonding);

        UnbondingResponse {
            metadata: unbonding.metadata,
            validator: unbonding.validator,
            unbonding_amount,
            release_time: unbonding.release_time
        }
    }

    #[view]
    /// Get delegation info of specified addr and validator
    public fun get_delegation(
        addr: address, metadata: Object<Metadata>, validator: String
    ): DelegationResponse acquires DelegationStore, ModuleStore {
        assert!(
            is_account_registered(addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let delegation_store = borrow_global<DelegationStore>(addr);
        let delegation =
            load_delegation(
                &delegation_store.delegations,
                metadata,
                validator
            );

        let module_store = borrow_global<ModuleStore>(@initia_std);
        let state = load_staking_state(
            &module_store.staking_states,
            metadata,
            validator
        );

        let reward = calculate_reward(delegation, state);

        DelegationResponse {
            metadata,
            validator,
            share: delegation.share,
            unclaimed_reward: reward
        }
    }

    #[view]
    /// Get all delegation info of an addr
    public fun get_delegations(
        addr: address,
        metadata: Object<Metadata>,
        start_after: Option<String>,
        limit: u8
    ): vector<DelegationResponse> acquires DelegationStore, ModuleStore {
        if (limit > MAX_LIMIT) {
            limit = MAX_LIMIT;
        };

        assert!(
            is_account_registered(addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let module_store = borrow_global<ModuleStore>(@initia_std);
        let staking_states = table::borrow(&module_store.staking_states, metadata);

        let delegation_store = borrow_global<DelegationStore>(addr);
        let delegations = table::borrow(&delegation_store.delegations, metadata);
        let delegations_iter = table::iter(delegations, option::none(), start_after, 2);

        let prepare = table::prepare(delegations_iter);
        let res: vector<DelegationResponse> = vector[];
        while (vector::length(&res) < (limit as u64) && prepare) {
            let (validator, delegation) = table::next(delegations_iter);
            let state = table::borrow(staking_states, validator);
            let reward = calculate_reward(delegation, state);
            vector::push_back(
                &mut res,
                DelegationResponse {
                    metadata: delegation.metadata,
                    validator: delegation.validator,
                    share: delegation.share,
                    unclaimed_reward: reward
                }
            );
            prepare = table::prepare(delegations_iter);
        };

        res
    }

    #[view]
    /// Get unbonding info of (addr, metadata, validator, release time)
    public fun get_unbonding(
        addr: address,
        metadata: Object<Metadata>,
        validator: String,
        release_time: u64
    ): UnbondingResponse acquires DelegationStore, ModuleStore {
        assert!(
            is_account_registered(addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let delegation_store = borrow_global<DelegationStore>(addr);

        let unbonding =
            load_unbonding(
                &delegation_store.unbondings,
                metadata,
                validator,
                release_time
            );
        let unbonding_amount = get_unbonding_amount_from_unbonding(unbonding);

        UnbondingResponse {
            metadata: unbonding.metadata,
            validator: unbonding.validator,
            unbonding_amount,
            release_time
        }
    }

    #[view]
    /// Get all unbondings of (addr, validator)
    public fun get_unbondings(
        addr: address,
        metadata: Object<Metadata>,
        start_after_validator: Option<String>,
        start_after_release_time: Option<u64>,
        limit: u8
    ): vector<UnbondingResponse> acquires DelegationStore, ModuleStore {
        if (limit > MAX_LIMIT) {
            limit = MAX_LIMIT;
        };

        assert!(
            is_account_registered(addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        assert!(
            option::is_some(&start_after_validator)
                == option::is_some(&start_after_release_time),
            error::invalid_argument(EINVALID_START_AFTER)
        );

        let delegation_store = borrow_global<DelegationStore>(addr);
        let unbondings = table::borrow(&delegation_store.unbondings, metadata);

        let start_after =
            if (option::is_some(&start_after_validator)) {
                option::some(
                    UnbondingKey {
                        validator: *option::borrow(&start_after_validator),
                        release_time: *option::borrow(&start_after_release_time)
                    }
                )
            } else {
                option::none()
            };

        let unbondings_iter = table::iter(unbondings, option::none(), start_after, 2);

        let res: vector<UnbondingResponse> = vector[];
        while (vector::length(&res) < (limit as u64)
            && table::prepare<UnbondingKey, Unbonding>(unbondings_iter)) {
            let (_, unbonding) = table::next<UnbondingKey, Unbonding>(unbondings_iter);
            let unbonding_amount = get_unbonding_amount_from_unbonding(unbonding);
            vector::push_back(
                &mut res,
                UnbondingResponse {
                    metadata: unbonding.metadata,
                    validator: unbonding.validator,
                    unbonding_amount,
                    release_time: unbonding.release_time
                }
            );
        };

        res
    }

    // Query helpers

    /// get `metadata` from `DelegationResponse`
    public fun get_metadata_from_delegation_response(
        delegation_res: &DelegationResponse
    ): Object<Metadata> {
        delegation_res.metadata
    }

    /// get `validator` from `DelegationResponse`
    public fun get_validator_from_delegation_response(
        delegation_res: &DelegationResponse
    ): String {
        delegation_res.validator
    }

    /// get `share` from `DelegationResponse`
    public fun get_share_from_delegation_response(
        delegation_res: &DelegationResponse
    ): BigDecimal {
        delegation_res.share
    }

    /// get `unclaimed_reward` from `DelegationResponse`
    public fun get_unclaimed_reward_from_delegation_response(
        delegation_res: &DelegationResponse
    ): u64 {
        delegation_res.unclaimed_reward
    }

    /// get `metadata` from `UnbondingResponse`
    public fun get_metadata_from_unbonding_response(
        unbonding_res: &UnbondingResponse
    ): Object<Metadata> {
        unbonding_res.metadata
    }

    /// get `validator` from `UnbondingResponse`
    public fun get_validator_from_unbonding_response(
        unbonding_res: &UnbondingResponse
    ): String {
        unbonding_res.validator
    }

    /// get `release_time` from `UnbondingResponse`
    public fun get_release_time_from_unbonding_response(
        unbonding_res: &UnbondingResponse
    ): u64 {
        unbonding_res.release_time
    }

    /// get `unbonding_amount` from `UnbondingResponse`
    public fun get_unbonding_amount_from_unbonding_response(
        unbonding_res: &UnbondingResponse
    ): u64 {
        unbonding_res.unbonding_amount
    }

    // Chain operations

    /// Check signer is chain
    fun check_chain_permission(chain: &signer) {
        assert!(
            signer::address_of(chain) == @initia_std,
            error::permission_denied(EUNAUTHORIZED_CHAIN_OPERATION)
        );
    }

    /// Initialize, Make staking store
    public entry fun initialize_for_chain(
        chain: &signer, metadata: Object<Metadata>
    ) acquires ModuleStore {
        check_chain_permission(chain);

        let module_store = borrow_global_mut<ModuleStore>(@initia_std);

        assert!(
            !table::contains(&module_store.staking_states, metadata),
            error::already_exists(ESTAKING_STATE_ALREADY_EXISTS)
        );
        table::add(
            &mut module_store.staking_states,
            metadata,
            table::new()
        );
    }

    /// Slash unbonding coin
    public entry fun slash_unbonding_for_chain(
        chain: &signer,
        metadata: Object<Metadata>,
        validator: String,
        fraction: BigDecimal
    ) acquires ModuleStore {
        assert!(
            bigdecimal::le(fraction, bigdecimal::one()),
            error::invalid_argument(EINVALID_SLASH_FRACTION)
        );

        check_chain_permission(chain);

        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let state =
            load_staking_state_mut(
                &mut module_store.staking_states,
                metadata,
                validator
            );

        let unbonding_amount = fungible_asset::balance(state.unbonding_coin_store);
        let slash_amount = bigdecimal::mul_by_u64_truncate(fraction, unbonding_amount);

        if (slash_amount > 0) {
            let unbonding_coin_store_signer =
                &object::generate_signer_for_extending(&state.unbonding_coin_store_ref);
            let slash_coin =
                fungible_asset::withdraw(
                    unbonding_coin_store_signer,
                    state.unbonding_coin_store,
                    slash_amount
                );

            // deposit to relayer for fund community pool
            // relayer is module address, so we need to use sudo_deposit
            coin::sudo_deposit(@relayer, slash_coin);
            let staking_module = create_signer(@relayer);

            // fund to community pool
            cosmos::fund_community_pool(&staking_module, metadata, slash_amount);
        }
    }

    /// Deposit unbonding coin to global store
    public entry fun deposit_unbonding_coin_for_chain(
        chain: &signer,
        metadata: Object<Metadata>,
        validators: vector<String>,
        amounts: vector<u64>
    ) acquires ModuleStore {
        check_chain_permission(chain);

        assert!(
            vector::length(&validators) == vector::length(&amounts),
            error::invalid_argument(ELENGTH_MISMATCH)
        );
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let staking_module = create_signer(@relayer);

        let index = 0;
        while (index < vector::length(&validators)) {
            let validator = *vector::borrow(&validators, index);
            let amount = *vector::borrow(&amounts, index);
            let state =
                load_staking_state_mut(
                    &mut module_store.staking_states,
                    metadata,
                    validator
                );

            // calculate share
            let total_unbonding_amount =
                fungible_asset::balance(state.unbonding_coin_store);
            let share_amount_ratio =
                if (total_unbonding_amount == 0) {
                    bigdecimal::one()
                } else {
                    bigdecimal::div_by_u64(
                        state.unbonding_share, total_unbonding_amount
                    )
                };

            let share_diff =
                bigdecimal::mul(
                    share_amount_ratio, bigdecimal::from_ratio_u64(amount, 1)
                );
            state.unbonding_share = bigdecimal::add(state.unbonding_share, share_diff);

            let unbonding_coin = coin::withdraw(&staking_module, metadata, amount);
            fungible_asset::deposit(state.unbonding_coin_store, unbonding_coin);

            index = index + 1;
        }
    }

    /// Deposit staking reward, and update `reward_index`
    public entry fun deposit_reward_for_chain(
        chain: &signer,
        metadata: Object<Metadata>,
        validators: vector<String>,
        reward_amounts: vector<u64>
    ) acquires ModuleStore {
        check_chain_permission(chain);

        assert!(
            vector::length(&validators) == vector::length(&reward_amounts),
            error::invalid_argument(ELENGTH_MISMATCH)
        );
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let staking_module = create_signer(@relayer);
        let reward_metadata = reward_metadata();

        let index = 0;
        while (index < vector::length(&validators)) {
            let validator = *vector::borrow(&validators, index);
            let reward_amount = *vector::borrow(&reward_amounts, index);
            let reward = coin::withdraw(
                &staking_module,
                reward_metadata,
                reward_amount
            );

            let state =
                load_staking_state_mut(
                    &mut module_store.staking_states,
                    metadata,
                    validator
                );
            state.reward_index = bigdecimal::add(
                state.reward_index,
                bigdecimal::rev(
                    bigdecimal::div_by_u64(state.total_share, reward_amount)
                )
            );

            fungible_asset::deposit(state.reward_coin_store, reward);

            index = index + 1;
        }
    }

    // User operations

    /// Check the DelegationStore is already exist
    public fun is_account_registered(account_addr: address): bool {
        exists<DelegationStore>(account_addr)
    }

    /// Register an account delegation store
    public entry fun register(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(
            !is_account_registered(account_addr),
            error::already_exists(EDELEGATION_STORE_ALREADY_EXISTS)
        );

        let delegation_store = DelegationStore {
            delegations: table::new<Object<Metadata>, Table<String, Delegation>>(),
            unbondings: table::new<Object<Metadata>, Table<UnbondingKey, Unbonding>>()
        };

        move_to(account, delegation_store);
    }

    /// Delegate coin to a validator and deposit reward to signer.
    public entry fun delegate_script(
        account: &signer,
        metadata: Object<Metadata>,
        validator: String,
        amount: u64
    ) acquires DelegationStore, ModuleStore {
        let account_addr = signer::address_of(account);
        if (!is_account_registered(account_addr)) {
            register(account);
        };

        let coin = coin::withdraw(account, metadata, amount);
        let delegation = delegate(validator, coin);

        let reward = deposit_delegation(account_addr, delegation);

        event::emit(
            RewardEvent {
                account: account_addr,
                metadata,
                amount: fungible_asset::amount(&reward)
            }
        );

        coin::deposit(account_addr, reward);
    }

    /// Delegate a fa to a validator.
    public fun delegate(validator: String, fa: FungibleAsset): Delegation acquires ModuleStore {
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let metadata = fungible_asset::asset_metadata(&fa);

        assert!(
            table::contains(&module_store.staking_states, metadata),
            error::not_found(ESTAKING_STATE_NOT_EXISTS)
        );
        let states = table::borrow_mut(&mut module_store.staking_states, metadata);

        if (!table::contains(states, validator)) {
            let reward_coin_store_ref = &object::create_object(@initia_std, false);
            let unbonding_coin_store_ref = &object::create_object(@initia_std, false);

            let reward_coin_store_address =
                object::address_from_constructor_ref(reward_coin_store_ref);
            let reward_coin_store =
                primary_fungible_store::create_primary_store(
                    reward_coin_store_address, reward_metadata()
                );

            let unbonding_coin_store_address =
                object::address_from_constructor_ref(unbonding_coin_store_ref);
            let unbonding_coin_store =
                primary_fungible_store::create_primary_store(
                    unbonding_coin_store_address, metadata
                );

            table::add(
                states,
                validator,
                StakingState {
                    metadata,
                    validator,
                    total_share: bigdecimal::zero(),
                    unbonding_share: bigdecimal::zero(),
                    reward_index: bigdecimal::zero(),
                    reward_coin_store_ref: object::generate_extend_ref(
                        reward_coin_store_ref
                    ),
                    unbonding_coin_store_ref: object::generate_extend_ref(
                        unbonding_coin_store_ref
                    ),
                    reward_coin_store,
                    unbonding_coin_store
                }
            )
        };

        let share_diff =
            delegate_internal(
                *string::bytes(&validator),
                &metadata,
                fungible_asset::amount(&fa)
            );
        let state =
            load_staking_state_mut(
                &mut module_store.staking_states,
                metadata,
                validator
            );
        state.total_share = bigdecimal::add(state.total_share, share_diff);

        // deposit to relayer
        // relayer is module address, so we need to use sudo_deposit
        coin::sudo_deposit(@relayer, fa);

        Delegation {
            metadata,
            validator,
            share: share_diff,
            reward_index: state.reward_index
        }
    }

    /// Undelegate coin from a validator and deposit reward to signer.
    /// unbonding amount can be slightly different with input amount due to round error.
    public entry fun undelegate_script(
        account: &signer,
        metadata: Object<Metadata>,
        validator: String,
        amount: u64
    ) acquires DelegationStore, ModuleStore {

        let account_addr = signer::address_of(account);

        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let share = amount_to_share(*string::bytes(&validator), &metadata, amount);

        let delegation = withdraw_delegation(account, metadata, validator, share);
        let (reward, unbonding) = undelegate(delegation);

        event::emit(
            RewardEvent {
                account: account_addr,
                metadata,
                amount: fungible_asset::amount(&reward)
            }
        );

        coin::deposit(account_addr, reward);
        deposit_unbonding(account_addr, unbonding);
    }

    public fun undelegate(delegation: Delegation): (FungibleAsset, Unbonding) acquires ModuleStore {
        let share = delegation.share;
        let validator = delegation.validator;
        let metadata = delegation.metadata;

        let (unbonding_amount, release_time) =
            undelegate_internal(*string::bytes(&validator), &metadata, &share);
        let reward = destroy_delegation_and_extract_reward(delegation);

        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let state =
            load_staking_state_mut(
                &mut module_store.staking_states,
                metadata,
                validator
            );

        assert!(
            bigdecimal::ge(state.total_share, share),
            error::invalid_state(EINSUFFICIENT_UNBONDING_DELEGATION_TOTAL_SHARE)
        );
        state.total_share = bigdecimal::sub(state.total_share, share);

        let unbonding_share =
            unbonding_share_from_amount(metadata, validator, unbonding_amount);
        let unbonding = Unbonding { metadata, validator, unbonding_share, release_time };

        (reward, unbonding)
    }

    /// Claim `unbonding_coin` from expired unbonding.
    public entry fun claim_unbonding_script(
        account: &signer,
        metadata: Object<Metadata>,
        validator: String,
        release_time: u64
    ) acquires DelegationStore, ModuleStore {
        let account_addr = signer::address_of(account);

        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        // withdraw unbonding all
        let unbonding_info = get_unbonding(
            account_addr,
            metadata,
            validator,
            release_time
        );
        let unbonding =
            withdraw_unbonding(
                account,
                metadata,
                validator,
                release_time,
                unbonding_info.unbonding_amount
            );
        let unbonding_coin = claim_unbonding(unbonding);
        coin::deposit(account_addr, unbonding_coin)
    }

    public entry fun claim_reward_script(
        account: &signer, metadata: Object<Metadata>, validator: String
    ) acquires DelegationStore, ModuleStore {
        let account_addr = signer::address_of(account);

        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let delegation_store = borrow_global_mut<DelegationStore>(account_addr);
        let delegation =
            load_delegation_mut(
                &mut delegation_store.delegations,
                metadata,
                validator
            );
        let reward = claim_reward(delegation);

        event::emit(
            RewardEvent {
                account: account_addr,
                metadata,
                amount: fungible_asset::amount(&reward)
            }
        );

        coin::deposit(account_addr, reward);
    }

    /// Claim staking reward from the specified validator.
    public fun claim_reward(delegation: &mut Delegation): FungibleAsset acquires ModuleStore {
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);

        let metadata = delegation.metadata;
        let validator = delegation.validator;
        let state = load_staking_state(
            &module_store.staking_states,
            metadata,
            validator
        );

        let reward_amount = calculate_reward(delegation, state);
        let reward =
            if (reward_amount == 0) {
                fungible_asset::zero(reward_metadata())
            } else {
                let reward_coin_store_signer =
                    &object::generate_signer_for_extending(
                        &state.reward_coin_store_ref
                    );
                fungible_asset::withdraw(
                    reward_coin_store_signer,
                    state.reward_coin_store,
                    reward_amount
                )
            };

        delegation.reward_index = state.reward_index;

        reward
    }

    /// Calculate unclaimed reward
    fun calculate_reward(delegation: &Delegation, state: &StakingState): u64 {
        assert!(
            delegation.metadata == state.metadata,
            error::invalid_argument(EMETADATA_MISMATCH)
        );

        let index_diff = bigdecimal::sub(state.reward_index, delegation.reward_index);
        bigdecimal::truncate_u64(bigdecimal::mul(index_diff, delegation.share))
    }

    /// For delegation object

    /// return empty delegation resource
    public fun empty_delegation(
        metadata: Object<Metadata>, validator: String
    ): Delegation {
        Delegation {
            metadata,
            validator,
            share: bigdecimal::zero(),
            reward_index: bigdecimal::zero()
        }
    }

    /// Get `metadata` from `Delegation`
    public fun get_metadata_from_delegation(delegation: &Delegation): Object<Metadata> {
        delegation.metadata
    }

    /// Get `validator` from `Delegation`
    public fun get_validator_from_delegation(delegation: &Delegation): String {
        delegation.validator
    }

    /// Get `share` from `Delegation`
    public fun get_share_from_delegation(delegation: &Delegation): BigDecimal {
        delegation.share
    }

    /// Destroy empty delegation
    public fun destroy_empty_delegation(delegation: Delegation) {
        assert!(
            bigdecimal::is_zero(delegation.share),
            error::invalid_argument(ENOT_EMPTY)
        );
        let Delegation { metadata: _, validator: _, share: _, reward_index: _ } =
            delegation;
    }

    /// Deposit the delegation into recipient's account.
    public fun deposit_delegation(
        account_addr: address, delegation: Delegation
    ): FungibleAsset acquires DelegationStore, ModuleStore {
        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let metadata = delegation.metadata;
        let validator = delegation.validator;

        let delegation_store = borrow_global_mut<DelegationStore>(account_addr);
        if (!table::contains(&delegation_store.delegations, metadata)) {
            table::add(
                &mut delegation_store.delegations,
                metadata,
                table::new()
            );
        };

        let delegations = table::borrow_mut(&mut delegation_store.delegations, metadata);
        if (!table::contains(delegations, validator)) {
            table::add(
                delegations,
                validator,
                empty_delegation(delegation.metadata, delegation.validator)
            );
        };

        event::emit(
            DelegationDepositEvent {
                account: account_addr,
                metadata: delegation.metadata,
                share: delegation.share,
                validator: delegation.validator
            }
        );

        let dst_delegation =
            load_delegation_mut(
                &mut delegation_store.delegations,
                metadata,
                validator
            );

        merge_delegation(dst_delegation, delegation)
    }

    /// Withdraw specified `share` from delegation.
    public fun withdraw_delegation(
        account: &signer,
        metadata: Object<Metadata>,
        validator: String,
        share: BigDecimal
    ): Delegation acquires DelegationStore {
        let account_addr = signer::address_of(account);

        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let delegation_store = borrow_global_mut<DelegationStore>(account_addr);
        let delegation =
            load_delegation_mut(
                &mut delegation_store.delegations,
                metadata,
                validator
            );

        event::emit(
            DelegationWithdrawEvent { account: account_addr, metadata, share, validator }
        );

        // If withdraw all, remove delegation
        if (delegation.share == share) {
            let delegations =
                table::borrow_mut(&mut delegation_store.delegations, metadata);
            table::remove(delegations, validator)
            // Else extract
        } else {
            extract_delegation(delegation, share)
        }
    }

    /// Extracts specified share of delegatiion from the passed-in `delegation`.
    public fun extract_delegation(
        delegation: &mut Delegation, share: BigDecimal
    ): Delegation {
        assert!(
            bigdecimal::ge(delegation.share, share),
            error::invalid_argument(EINSUFFICIENT_AMOUNT)
        );

        // Total share is invariant and reward_indexes are same btw given and new one so no need to update `reward_index`.
        delegation.share = bigdecimal::sub(delegation.share, share);
        Delegation {
            metadata: delegation.metadata,
            validator: delegation.validator,
            reward_index: delegation.reward_index,
            share
        }
    }

    /// "Merges" the two given delegations.  The delegation passed in as `dst_delegation` will have a value equal
    /// to the sum of the two shares (`dst_delegation` and `source_delegation`).
    public fun merge_delegation(
        dst_delegation: &mut Delegation, source_delegation: Delegation
    ): FungibleAsset acquires ModuleStore {
        assert!(
            dst_delegation.metadata == source_delegation.metadata,
            error::invalid_argument(EMETADATA_MISMATCH)
        );
        assert!(
            dst_delegation.validator == source_delegation.validator,
            error::invalid_argument(EVALIDATOR_MISMATCH)
        );

        let reward = claim_reward(dst_delegation);

        dst_delegation.share = bigdecimal::add(
            dst_delegation.share, source_delegation.share
        );
        let source_reward = destroy_delegation_and_extract_reward(source_delegation);

        fungible_asset::merge(&mut reward, source_reward);

        reward
    }

    /// Destroy delegation and extract reward from delegation
    fun destroy_delegation_and_extract_reward(
        delegation: Delegation
    ): FungibleAsset acquires ModuleStore {
        let metadata = delegation.metadata;
        let validator = delegation.validator;

        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let state = load_staking_state(
            &module_store.staking_states,
            metadata,
            validator
        );

        let reward_amount = calculate_reward(&delegation, state);
        let reward =
            if (reward_amount == 0) {
                fungible_asset::zero(reward_metadata())
            } else {
                let reward_coin_store_signer =
                    &object::generate_signer_for_extending(
                        &state.reward_coin_store_ref
                    );
                fungible_asset::withdraw(
                    reward_coin_store_signer,
                    state.reward_coin_store,
                    reward_amount
                )
            };

        let Delegation { metadata: _, share: _, validator: _, reward_index: _ } =
            delegation;

        reward
    }

    /// For unbonding object
    ///

    fun unbonding_share_from_amount(
        metadata: Object<Metadata>, validator: String, unbonding_amount: u64
    ): BigDecimal acquires ModuleStore {
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let state = load_staking_state(
            &module_store.staking_states,
            metadata,
            validator
        );

        let share_amount_ratio = unbonding_share_amount_ratio(state);
        bigdecimal::mul(
            share_amount_ratio, bigdecimal::from_ratio_u64(unbonding_amount, 1)
        )
    }

    fun unbonding_amount_from_share(
        metadata: Object<Metadata>, validator: String, unbonding_share: BigDecimal
    ): u64 acquires ModuleStore {
        let module_store = borrow_global<ModuleStore>(@initia_std);
        let state = load_staking_state(
            &module_store.staking_states,
            metadata,
            validator
        );

        let amount_share_ratio = bigdecimal::rev(unbonding_share_amount_ratio(state));
        bigdecimal::truncate_u64(bigdecimal::mul(amount_share_ratio, unbonding_share))
    }

    fun unbonding_share_amount_ratio(state: &StakingState): BigDecimal {
        let total_unbonding_amount = fungible_asset::balance(state.unbonding_coin_store);
        let share_amount_ratio =
            if (total_unbonding_amount == 0) {
                bigdecimal::one()
            } else {
                bigdecimal::div_by_u64(state.unbonding_share, total_unbonding_amount)
            };

        if (bigdecimal::lt(share_amount_ratio, bigdecimal::one())) {
            // cap total unbonding amount to total share to prevent poissible attack like depositing huge amount of unbonding coin
            // directly to the validator's unbonding_coin_store.
            bigdecimal::one()
        } else {
            share_amount_ratio
        }
    }

    /// return empty unbonding resource
    public fun empty_unbonding(
        metadata: Object<Metadata>, validator: String, release_time: u64
    ): Unbonding {
        Unbonding {
            metadata,
            validator,
            unbonding_share: bigdecimal::zero(),
            release_time
        }
    }

    /// Get `metadata` from `Unbonding`
    public fun get_metadata_from_unbonding(unbonding: &Unbonding): Object<Metadata> {
        unbonding.metadata
    }

    /// Get `validator` from `Unbonding`
    public fun get_validator_from_unbonding(unbonding: &Unbonding): String {
        unbonding.validator
    }

    /// Get `release_time` from `Unbonding`
    public fun get_release_time_from_unbonding(unbonding: &Unbonding): u64 {
        unbonding.release_time
    }

    /// Get `unbonding_share` from `Unbonding`
    public fun get_unbonding_share_from_unbonding(unbonding: &Unbonding): BigDecimal {
        unbonding.unbonding_share
    }

    /// Get `unbonding_amount` from `Unbonding`
    public fun get_unbonding_amount_from_unbonding(unbonding: &Unbonding): u64 acquires ModuleStore {
        unbonding_amount_from_share(
            unbonding.metadata,
            unbonding.validator,
            unbonding.unbonding_share
        )
    }

    /// Destroy empty unbonding
    public fun destroy_empty_unbonding(unbonding: Unbonding) {
        assert!(
            bigdecimal::is_zero(unbonding.unbonding_share),
            error::invalid_argument(ENOT_EMPTY)
        );
        let Unbonding { metadata: _, validator: _, unbonding_share: _, release_time: _ } =
            unbonding;
    }

    /// Deposit the unbonding into recipient's account.
    public fun deposit_unbonding(
        account_addr: address, unbonding: Unbonding
    ) acquires DelegationStore {
        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let metadata = unbonding.metadata;
        let validator = unbonding.validator;
        let release_time = unbonding.release_time;

        let key = UnbondingKey { validator, release_time };

        let delegation_store = borrow_global_mut<DelegationStore>(account_addr);
        if (!table::contains(&delegation_store.unbondings, metadata)) {
            table::add(
                &mut delegation_store.unbondings,
                metadata,
                table::new()
            );
        };

        let unbondings = table::borrow_mut(&mut delegation_store.unbondings, metadata);
        if (!table::contains(unbondings, key)) {
            table::add(
                unbondings,
                key,
                empty_unbonding(metadata, validator, release_time)
            );
        };

        event::emit(
            UnbondingDepositEvent {
                account: account_addr,
                metadata,
                validator,
                share: unbonding.unbonding_share,
                release_time
            }
        );

        let dst_unbonding = table::borrow_mut(unbondings, key);
        merge_unbonding(dst_unbonding, unbonding);
    }

    /// Withdraw specified `amount` of unbonding_amount from the unbonding.
    public fun withdraw_unbonding(
        account: &signer,
        metadata: Object<Metadata>,
        validator: String,
        release_time: u64,
        amount: u64
    ): Unbonding acquires DelegationStore, ModuleStore {
        let account_addr = signer::address_of(account);

        assert!(
            is_account_registered(account_addr),
            error::not_found(EDELEGATION_STORE_NOT_EXISTS)
        );

        let delegation_store = borrow_global_mut<DelegationStore>(account_addr);
        let unbonding =
            load_unbonding_mut(
                &mut delegation_store.unbondings,
                metadata,
                validator,
                release_time
            );

        event::emit(
            UnbondingWithdrawEvent {
                account: account_addr,
                metadata,
                validator,
                share: unbonding.unbonding_share,
                release_time: unbonding.release_time
            }
        );

        let share = unbonding_share_from_amount(metadata, validator, amount);
        if (unbonding.unbonding_share == share) {
            // If withdraw all, remove unbonding
            let unbondings = table::borrow_mut(
                &mut delegation_store.unbondings, metadata
            );

            table::remove(
                unbondings,
                UnbondingKey { validator, release_time }
            )
        } else {
            // Else extract
            extract_unbonding(unbonding, share)
        }
    }

    /// Extracts specified amount of unbonding from the passed-in `unbonding`.
    public fun extract_unbonding(
        unbonding: &mut Unbonding, share: BigDecimal
    ): Unbonding {
        assert!(
            bigdecimal::ge(unbonding.unbonding_share, share),
            error::invalid_argument(EINSUFFICIENT_AMOUNT)
        );

        unbonding.unbonding_share = bigdecimal::sub(unbonding.unbonding_share, share);
        Unbonding {
            metadata: unbonding.metadata,
            validator: unbonding.validator,
            unbonding_share: share,
            release_time: unbonding.release_time
        }
    }

    /// Merge the two given unbondings. The unbonding_coin of the `source_unbonding`
    /// will be merged into the unbonding_coin of the `dst_unbonding`.
    /// `release_time` of the `source_unbonding` must be sooner than or equal to the one of `dst_unbonding`
    public fun merge_unbonding(
        dst_unbonding: &mut Unbonding, source_unbonding: Unbonding
    ) {
        assert!(
            dst_unbonding.metadata == source_unbonding.metadata,
            error::invalid_argument(EMETADATA_MISMATCH)
        );
        assert!(
            dst_unbonding.validator == source_unbonding.validator,
            error::invalid_argument(EVALIDATOR_MISMATCH)
        );
        assert!(
            dst_unbonding.release_time >= source_unbonding.release_time,
            error::invalid_argument(ERELEASE_TIME)
        );

        dst_unbonding.unbonding_share = bigdecimal::add(
            dst_unbonding.unbonding_share, source_unbonding.unbonding_share
        );
        let Unbonding { metadata: _, validator: _, unbonding_share: _, release_time: _ } =
            source_unbonding;
    }

    /// Claim `unbonding_coin` from expired unbonding.
    public fun claim_unbonding(unbonding: Unbonding): FungibleAsset acquires ModuleStore {
        let (_, timestamp) = block::get_block_info();
        assert!(
            unbonding.release_time <= timestamp,
            error::invalid_state(ENOT_RELEASED)
        );

        let unbonding_amount = get_unbonding_amount_from_unbonding(&unbonding);
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        let metadata = unbonding.metadata;
        let validator = unbonding.validator;

        // extract coin
        let state =
            load_staking_state_mut(
                &mut module_store.staking_states,
                metadata,
                validator
            );
        let unbonding_coin =
            if (unbonding_amount == 0) {
                fungible_asset::zero(metadata)
            } else {
                let unbonding_coin_store_signer =
                    &object::generate_signer_for_extending(
                        &state.unbonding_coin_store_ref
                    );
                fungible_asset::withdraw(
                    unbonding_coin_store_signer,
                    state.unbonding_coin_store,
                    unbonding_amount
                )
            };

        // decrease share
        state.unbonding_share = bigdecimal::sub(
            state.unbonding_share, unbonding.unbonding_share
        );

        // destroy empty
        let Unbonding { metadata: _, validator: _, unbonding_share: _, release_time: _ } =
            unbonding;

        unbonding_coin
    }

    // Native functions

    native fun delegate_internal(
        validator: vector<u8>, metadata: &Object<Metadata>, amount: u64
    ): BigDecimal /* share amount */;

    native fun undelegate_internal(
        validator: vector<u8>, metadata: &Object<Metadata>, share: &BigDecimal
    ): (u64 /* unbonding amount */, u64 /* unbond timestamp */);

    native public fun share_to_amount(
        validator: vector<u8>, metadata: &Object<Metadata>, share: &BigDecimal
    ): u64 /* delegation amount */;

    native public fun amount_to_share(
        validator: vector<u8>, metadata: &Object<Metadata>, amount: u64
    ): BigDecimal /* share amount */;

    #[test_only]
    native public fun set_staking_share_ratio(
        validator: vector<u8>,
        metadata: &Object<Metadata>,
        share: &BigDecimal,
        amount: u64
    );

    #[test_only]
    const STAKING_SYMBOL: vector<u8> = b"ustake";

    #[test_only]
    public fun staking_metadata_for_test(): Object<Metadata> {
        coin::metadata(@initia_std, string::utf8(STAKING_SYMBOL))
    }

    #[test_only]
    public fun deposit_reward_for_test(
        chain: &signer,
        metadata: Object<Metadata>,
        validators: vector<String>,
        amounts: vector<u64>
    ) acquires ModuleStore {
        deposit_reward_for_chain(chain, metadata, validators, amounts);
    }

    #[test_only]
    use std::block::set_block_info;

    #[test_only]
    public fun init_module_for_test() {
        init_module(&initia_std::account::create_signer_for_test(@initia_std));
    }

    #[test_only]
    public fun test_setup() acquires ModuleStore {
        init_module_for_test();
        let chain = &initia_std::account::create_signer_for_test(@initia_std);
        let chain_addr = @initia_std;

        primary_fungible_store::init_module_for_test();

        // initialize staking coin
        let (mint_cap, _burn_cap, _freeze_cap) =
            coin::initialize(
                chain,
                option::none(),
                string::utf8(b"Staking Coin"),
                string::utf8(STAKING_SYMBOL),
                6,
                string::utf8(b""),
                string::utf8(b"")
            );

        coin::mint_to(&mint_cap, chain_addr, 100000000000000);

        // initialize reward coin
        let (mint_cap, _burn_cap, _freeze_cap) =
            coin::initialize(
                chain,
                option::none(),
                string::utf8(b"Reward Coin"),
                string::utf8(REWARD_SYMBOL),
                6,
                string::utf8(b""),
                string::utf8(b"")
            );

        coin::mint_to(&mint_cap, chain_addr, 100000000000000);

        initialize_for_chain(chain, staking_metadata_for_test());
    }

    #[test_only]
    public fun fund_stake_coin(
        chain: &signer, receiver: address, amount: u64
    ) {
        coin::deposit(
            receiver,
            coin::withdraw(chain, staking_metadata_for_test(), amount)
        );
    }

    #[test_only]
    public fun fund_reward_coin(
        chain: &signer, receiver: address, amount: u64
    ) {
        coin::deposit(
            receiver,
            coin::withdraw(chain, reward_metadata(), amount)
        );
    }

    #[test(chain = @0x1, user1 = @0x1234, user2 = @0x4321)]
    fun end_to_end(
        chain: &signer, user1: &signer, user2: &signer
    ) acquires DelegationStore, ModuleStore {
        test_setup();

        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);
        let validator = string::utf8(b"validator");

        fund_stake_coin(chain, user1_addr, 1000000000);
        set_block_info(100, 10000);

        register(user1);
        register(user2);

        let metadata = staking_metadata_for_test();
        let reward_metadata = reward_metadata();

        set_staking_share_ratio(
            *string::bytes(&validator),
            &metadata,
            &bigdecimal::one(),
            1
        );

        delegate_script(user1, metadata, validator, 10000000);

        assert!(
            coin::balance(user1_addr, metadata) == 990000000,
            0
        );

        let delegation = get_delegation(user1_addr, metadata, validator);
        assert!(delegation.validator == validator, 1);
        assert!(bigdecimal::truncate_u64(delegation.share) == 10000000, 2);
        assert!(delegation.unclaimed_reward == 0, 3);

        fund_reward_coin(chain, @relayer, 1000000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[1000000]
        );

        let delegation = get_delegation(user1_addr, metadata, validator);
        assert!(delegation.unclaimed_reward == 1000000, 4);

        let withdrawn_delegation =
            withdraw_delegation(
                user1,
                metadata,
                validator,
                bigdecimal::from_ratio_u64(5000000, 1)
            );
        let reward = deposit_delegation(user2_addr, withdrawn_delegation);
        assert!(fungible_asset::amount(&reward) == 500000, 5);
        coin::deposit(user1_addr, reward);

        let delegation = get_delegation(user1_addr, metadata, validator);
        assert!(delegation.unclaimed_reward == 500000, 6);

        claim_reward_script(user1, metadata, validator);
        assert!(
            coin::balance(user1_addr, reward_metadata) == 1000000,
            8
        );
        let delegation = get_delegation(user1_addr, metadata, validator);
        assert!(delegation.unclaimed_reward == 0, 8);

        fund_reward_coin(chain, @relayer, 1000000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[1000000]
        );
        let delegation = get_delegation(user1_addr, metadata, validator);
        assert!(delegation.unclaimed_reward == 500000, 9);

        undelegate_script(user1, metadata, validator, 5000000);
        assert!(
            coin::balance(user1_addr, reward_metadata) == 1500000,
            10
        );

        // undelegate trigger `deposit_unbonding_coin_for_chain`
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[5000000]
        );

        let unbondings =
            get_unbondings(
                user1_addr,
                metadata,
                option::none(),
                option::none(),
                1
            );
        let unbonding = vector::borrow(&unbondings, 0);

        let withdrawn_unbonding =
            withdraw_unbonding(
                user1,
                metadata,
                validator,
                unbonding.release_time,
                2500000
            );

        deposit_unbonding(user2_addr, withdrawn_unbonding);

        let unbonding =
            get_unbonding(
                user1_addr,
                metadata,
                validator,
                unbonding.release_time
            );
        assert!(unbonding.unbonding_amount == 2500000, 11);
        let unbonding =
            get_unbonding(
                user2_addr,
                metadata,
                validator,
                unbonding.release_time
            );
        assert!(unbonding.unbonding_amount == 2500000, 12);

        set_block_info(100, 8640000);

        claim_unbonding_script(
            user1,
            metadata,
            validator,
            unbonding.release_time
        );
        assert!(
            coin::balance(user1_addr, metadata) == 992500000,
            13
        );
    }

    #[test(chain = @0x1, user = @0x1234)]
    public fun test_delegate2(chain: &signer, user: &signer) acquires DelegationStore, ModuleStore {
        test_setup();

        let user_addr = signer::address_of(user);
        let validator = string::utf8(b"validator");

        fund_stake_coin(chain, user_addr, 1000000);
        set_block_info(100, 10000);

        register(user);

        let metadata = staking_metadata_for_test();
        let reward_metadata = reward_metadata();

        set_staking_share_ratio(
            *string::bytes(&validator),
            &metadata,
            &bigdecimal::from_u64(3),
            2
        );

        // Delegate with entry function
        delegate_script(user, metadata, validator, 100000);

        let delegation = get_delegation(user_addr, metadata, validator);
        assert!(bigdecimal::truncate_u64(delegation.share) == 150000, 0);
        assert!(delegation.validator == validator, 1);
        assert!(coin::balance(user_addr, metadata) == 900000, 2);

        // withdraw delegation
        let delegation0 =
            withdraw_delegation(
                user,
                metadata,
                validator,
                bigdecimal::from_ratio_u64(50000, 1)
            );
        let delegation = get_delegation(user_addr, metadata, validator);
        assert!(bigdecimal::truncate_u64(delegation.share) == 100000, 3);

        // withdraw all of rest delegation
        let delegation1 =
            withdraw_delegation(
                user,
                metadata,
                validator,
                bigdecimal::from_ratio_u64(50000, 1)
            );
        let delegations = get_delegations(user_addr, metadata, option::none(), 1);
        assert!(vector::length(&delegations) == 1, 4);
        assert!(
            bigdecimal::truncate_u64(vector::borrow(&delegations, 0).share) == 50000, 4
        );

        fund_reward_coin(chain, @relayer, 100000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[100000]
        );

        // deposit delegation
        let reward = deposit_delegation(user_addr, delegation0);
        assert!(fungible_asset::amount(&reward) == 66666, 5);

        let delegation = get_delegation(user_addr, metadata, validator);
        assert!(bigdecimal::truncate_u64(delegation.share) == 100000, 6);
        assert!(delegation.validator == validator, 7);

        coin::deposit(user_addr, reward);

        // extract delegation
        let delegation2 =
            extract_delegation(&mut delegation1, bigdecimal::from_ratio_u64(10000, 1));
        assert!(bigdecimal::truncate_u64(delegation1.share) == 40000, 8);
        assert!(bigdecimal::truncate_u64(delegation2.share) == 10000, 9);

        // merge delegation
        let reward = merge_delegation(&mut delegation1, delegation2);
        assert!(fungible_asset::amount(&reward) == 33332, 13);
        assert!(bigdecimal::truncate_u64(delegation1.share) == 50000, 14);
        coin::deposit(user_addr, reward);

        // delegate
        let coin = coin::withdraw(user, metadata, 100000);
        let delegation3 = delegate(validator, coin);
        assert!(bigdecimal::truncate_u64(delegation3.share) == 150000, 12);
        let reward = merge_delegation(&mut delegation1, delegation3);
        fungible_asset::destroy_zero(reward);

        let reward = deposit_delegation(user_addr, delegation1);
        assert!(fungible_asset::amount(&reward) == 0, 15);
        fungible_asset::destroy_zero(reward);

        // 1000000 (mint) - 100000 (delegate_script) - 100000 (delegate)
        // 99998 (rewards)
        assert!(
            coin::balance(user_addr, metadata) == 800000,
            16
        );
        assert!(
            coin::balance(user_addr, reward_metadata) == 99998,
            17
        );

        let delegation = get_delegation(user_addr, metadata, validator);
        assert!(bigdecimal::truncate_u64(delegation.share) == 300000, 6);
    }

    #[test(chain = @0x1, user = @0x1234)]
    public fun test_undelegate(chain: &signer, user: &signer) acquires DelegationStore, ModuleStore {
        test_setup();

        let user_addr = signer::address_of(user);
        let validator = string::utf8(b"validator");

        fund_stake_coin(chain, user_addr, 1000000);
        set_block_info(100, 10000);

        register(user);

        let metadata = staking_metadata_for_test();
        let reward_metadata = reward_metadata();

        set_staking_share_ratio(
            *string::bytes(&validator),
            &metadata,
            &bigdecimal::from_u64(1),
            1
        );

        delegate_script(user, metadata, validator, 100000);

        fund_reward_coin(chain, @relayer, 100000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[100000]
        );

        // undelegate with script
        undelegate_script(user, metadata, validator, 10000);

        // undelegate trigger `deposit_unbonding_coin_for_chain`
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[10000]
        );

        let delegation = get_delegation(user_addr, metadata, validator);
        assert!(bigdecimal::truncate_u64(delegation.share) == 90000, 0);

        let unbondings =
            get_unbondings(
                user_addr,
                metadata,
                option::none(),
                option::none(),
                1
            );
        let unbonding = vector::borrow(&unbondings, 0);
        let release_time = unbonding.release_time;
        assert!(unbonding.unbonding_amount == 10000, 1);
        assert!(coin::balance(user_addr, metadata) == 900000, 2);
        assert!(
            coin::balance(user_addr, reward_metadata) == 10000,
            3
        );

        // distribute reward
        fund_reward_coin(chain, @relayer, 90000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[90000]
        );

        // undelegate
        let delegation =
            withdraw_delegation(
                user,
                metadata,
                validator,
                bigdecimal::from_ratio_u64(10000, 1)
            );
        let (reward, unbonding0) = undelegate(delegation);
        assert!(fungible_asset::amount(&reward) == 20000, 4);
        assert!(bigdecimal::truncate_u64(unbonding0.unbonding_share) == 10000, 5);

        // undelegate trigger `deposit_unbonding_coin_for_chain`
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[10000]
        );

        coin::deposit(user_addr, reward);
        assert!(
            coin::balance(user_addr, reward_metadata) == 30000,
            3
        );

        // extract unbonding
        let unbonding1 =
            extract_unbonding(&mut unbonding0, bigdecimal::from_ratio_u64(5000, 1));
        assert!(bigdecimal::truncate_u64(unbonding0.unbonding_share) == 5000, 7);
        assert!(bigdecimal::truncate_u64(unbonding1.unbonding_share) == 5000, 8);

        // merge unbonding
        merge_unbonding(&mut unbonding0, unbonding1);
        assert!(bigdecimal::truncate_u64(unbonding0.unbonding_share) == 10000, 9);

        // deposit unbonding
        deposit_unbonding(user_addr, unbonding0);
        let unbonding = get_unbonding(user_addr, metadata, validator, release_time);
        assert!(unbonding.unbonding_amount == 20000, 10);

        // withdraw unbonding
        let unbonding = withdraw_unbonding(user, metadata, validator, release_time, 10000);
        assert!(bigdecimal::truncate_u64(unbonding.unbonding_share) == 10000, 11);

        // claim unbonding
        set_block_info(200, release_time);
        let coin = claim_unbonding(unbonding);
        assert!(fungible_asset::amount(&coin) == 10000, 12);
        coin::deposit(user_addr, coin);

        // claim unbonding with script
        claim_unbonding_script(user, metadata, validator, release_time);
        assert!(
            coin::balance(user_addr, metadata) == 920000,
            13
        );
    }

    #[test(chain = @0x1, user1 = @0x1234, user2 = @0x4321)]
    fun test_claim_reward(
        chain: &signer, user1: &signer, user2: &signer
    ) acquires DelegationStore, ModuleStore {
        test_setup();

        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        let validator = string::utf8(b"validator");

        fund_stake_coin(chain, user1_addr, 1000000);
        fund_stake_coin(chain, user2_addr, 1000000);

        set_block_info(100, 10000);

        register(user1);
        register(user2);

        let metadata = staking_metadata_for_test();
        let reward_metadata = reward_metadata();

        set_staking_share_ratio(
            *string::bytes(&validator),
            &metadata,
            &bigdecimal::from_u64(1),
            1
        );

        delegate_script(
            user1,
            metadata,
            string::utf8(b"validator"),
            1000000
        );

        fund_reward_coin(chain, @relayer, 100000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[100000]
        );

        // claim reward by script
        claim_reward_script(user1, metadata, validator);
        assert!(
            coin::balance(user1_addr, reward_metadata) == 100000,
            0
        );

        fund_reward_coin(chain, @relayer, 100000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[100000]
        );

        // claim reward
        let delegation =
            withdraw_delegation(
                user1,
                metadata,
                validator,
                bigdecimal::from_ratio_u64(1000000, 1)
            );
        let reward = claim_reward(&mut delegation);
        assert!(fungible_asset::amount(&reward) == 100000, 1);
        coin::deposit(user1_addr, reward);

        let reward = deposit_delegation(user1_addr, delegation);
        assert!(fungible_asset::amount(&reward) == 0, 2);
        fungible_asset::destroy_zero(reward);

        assert!(
            coin::balance(user1_addr, reward_metadata) == 200000,
            3
        );

        delegate_script(
            user2,
            metadata,
            string::utf8(b"validator"),
            1000000
        );

        fund_reward_coin(chain, @relayer, 100000);
        deposit_reward_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[100000]
        );
        claim_reward_script(user1, metadata, validator);
        assert!(
            coin::balance(user1_addr, reward_metadata) == 250000,
            4
        );
    }

    #[test]
    #[expected_failure(abort_code = 0x10007, location = Self)]
    public fun test_staking_destroy_not_empty_delegation() acquires ModuleStore {
        test_setup();

        let delegation = Delegation {
            metadata: staking_metadata_for_test(),
            validator: string::utf8(b"validator"),
            reward_index: bigdecimal::zero(),
            share: bigdecimal::from_ratio_u64(100, 1)
        };

        destroy_empty_delegation(delegation);
    }

    #[test]
    #[expected_failure(abort_code = 0x10007, location = Self)]
    public fun test_staking_destroy_not_empty_unbonding() acquires ModuleStore {
        test_setup();

        let unbonding = Unbonding {
            metadata: staking_metadata_for_test(),
            validator: string::utf8(b"validator"),
            unbonding_share: bigdecimal::from_ratio_u64(100, 1),
            release_time: 1234
        };

        destroy_empty_unbonding(unbonding);
    }

    #[test]
    #[expected_failure(abort_code = 0x10008, location = Self)]
    public fun test_staking_merge_delegation_validator_mistmatch() acquires ModuleStore {
        test_setup();

        let delegation1 = Delegation {
            metadata: staking_metadata_for_test(),
            validator: string::utf8(b"validator1"),
            reward_index: bigdecimal::zero(),
            share: bigdecimal::from_ratio_u64(100, 1)
        };

        let delegation2 = Delegation {
            metadata: staking_metadata_for_test(),
            validator: string::utf8(b"validator2"),
            reward_index: bigdecimal::zero(),
            share: bigdecimal::from_ratio_u64(100, 1)
        };

        let reward = merge_delegation(&mut delegation1, delegation2);
        let Delegation { metadata: _, share: _, validator: _, reward_index: _ } =
            delegation1;
        fungible_asset::destroy_zero(reward);
    }

    #[test]
    #[expected_failure(abort_code = 0x10009, location = Self)]
    public fun test_staking_merge_unbonding_release_time() acquires ModuleStore {
        test_setup();

        let validator = string::utf8(b"validator");
        let unbonding1 = Unbonding {
            metadata: staking_metadata_for_test(),
            validator,
            unbonding_share: bigdecimal::from_ratio_u64(100, 1),
            release_time: 1000
        };

        let unbonding2 = Unbonding {
            metadata: staking_metadata_for_test(),
            validator,
            unbonding_share: bigdecimal::from_ratio_u64(100, 1),
            release_time: 1234
        };

        merge_unbonding(&mut unbonding1, unbonding2);
        let Unbonding { metadata: _, validator: _, unbonding_share, release_time: _ } =
            unbonding1;

        assert!(bigdecimal::truncate_u64(unbonding_share) == 200, 1);
    }

    #[test(chain = @0x1, user = @0x1234)]
    #[expected_failure(abort_code = 0x3000A, location = Self)]
    public fun test_staking_claim_not_released_unbonding(
        chain: &signer, user: &signer
    ) acquires ModuleStore, DelegationStore {
        test_setup();

        let user_addr = signer::address_of(user);
        let validator = string::utf8(b"validator");

        fund_stake_coin(chain, user_addr, 100);

        register(user);

        let metadata = staking_metadata_for_test();
        set_staking_share_ratio(
            *string::bytes(&validator),
            &metadata,
            &bigdecimal::from_u64(1),
            1
        );

        // dummy delegation to create global states
        delegate_script(user, metadata, validator, 100);

        fund_stake_coin(chain, @relayer, 100);
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[100]
        );

        set_block_info(100, 100);

        let unbonding = Unbonding {
            metadata,
            validator,
            unbonding_share: bigdecimal::from_ratio_u64(100, 1),
            release_time: 1000
        };

        let coin = claim_unbonding(unbonding);
        assert!(fungible_asset::amount(&coin) == 100, 1);

        coin::deposit(@relayer, coin);
    }

    #[test(chain = @0x1, user = @0x1234)]
    public fun test_staking_query_entry_functions(
        chain: &signer, user: &signer
    ) acquires DelegationStore, ModuleStore {
        test_setup();

        let user_addr = signer::address_of(user);
        let metadata = staking_metadata_for_test();
        let validator1 = string::utf8(b"validator1");
        let validator2 = string::utf8(b"validator2");

        fund_stake_coin(chain, user_addr, 1000000);

        set_block_info(100, 10000);

        register(user);

        set_staking_share_ratio(
            *string::bytes(&validator1),
            &metadata,
            &bigdecimal::from_u64(1),
            1
        );
        set_staking_share_ratio(
            *string::bytes(&validator2),
            &metadata,
            &bigdecimal::from_u64(1),
            1
        );

        delegate_script(user, metadata, validator1, 100000);
        delegate_script(user, metadata, validator2, 100000);

        undelegate_script(user, metadata, validator1, 10000);
        undelegate_script(user, metadata, validator2, 10000);

        // undelegate trigger `deposit_unbonding_coin_for_chain`
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator1, validator2],
            vector[10000, 10000]
        );

        // update block info
        set_block_info(200, 20000);

        undelegate_script(user, metadata, validator1, 10000);

        // undelegate trigger `deposit_unbonding_coin_for_chain`
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator1],
            vector[10000]
        );

        let delegation = get_delegation(user_addr, metadata, validator1);
        assert!(
            delegation
                == DelegationResponse {
                    metadata,
                    validator: validator1,
                    share: bigdecimal::from_ratio_u64(80000, 1),
                    unclaimed_reward: 0
                },
            0
        );

        let delegations = get_delegations(user_addr, metadata, option::none(), 10);
        assert!(
            delegations
                == vector[
                    DelegationResponse {
                        metadata,
                        validator: validator2,
                        share: bigdecimal::from_ratio_u64(90000, 1),
                        unclaimed_reward: 0
                    },
                    DelegationResponse {
                        metadata,
                        validator: validator1,
                        share: bigdecimal::from_ratio_u64(80000, 1),
                        unclaimed_reward: 0
                    }
                ],
            1
        );

        let delegations = get_delegations(
            user_addr,
            metadata,
            option::some(validator2),
            10
        );
        assert!(
            delegations
                == vector[
                    DelegationResponse {
                        metadata,
                        validator: validator1,
                        share: bigdecimal::from_ratio_u64(80000, 1),
                        unclaimed_reward: 0
                    }
                ],
            2
        );

        let unbonding = get_unbonding(
            user_addr,
            metadata,
            validator1,
            10000 + 7 * 24 * 60 * 60
        );
        assert!(
            unbonding
                == UnbondingResponse {
                    metadata,
                    validator: validator1,
                    unbonding_amount: 10000,
                    release_time: 10000 + 7 * 24 * 60 * 60
                },
            3
        );

        let unbondings =
            get_unbondings(
                user_addr,
                metadata,
                option::none(),
                option::none(),
                10
            );
        assert!(
            unbondings
                == vector[
                    UnbondingResponse {
                        metadata,
                        validator: validator2,
                        unbonding_amount: 10000,
                        release_time: 10000 + 7 * 24 * 60 * 60
                    },
                    UnbondingResponse {
                        metadata,
                        validator: validator1,
                        unbonding_amount: 10000,
                        release_time: 20000 + 7 * 24 * 60 * 60
                    },
                    UnbondingResponse {
                        metadata,
                        validator: validator1,
                        unbonding_amount: 10000,
                        release_time: 10000 + 7 * 24 * 60 * 60
                    }
                ],
            4
        );

        let unbondings =
            get_unbondings(
                user_addr,
                metadata,
                option::some(validator1),
                option::some(20000 + 7 * 24 * 60 * 60),
                10
            );
        assert!(
            unbondings
                == vector[
                    UnbondingResponse {
                        metadata,
                        validator: validator1,
                        unbonding_amount: 10000,
                        release_time: 10000 + 7 * 24 * 60 * 60
                    }
                ],
            5
        );
    }

    #[test]
    public fun test_staking_share_to_amount() acquires ModuleStore {
        test_setup();

        let metadata = staking_metadata_for_test();
        let validator = vector::singleton(1u8);
        set_staking_share_ratio(
            validator,
            &metadata,
            &bigdecimal::from_u64(100),
            50u64
        );

        let amount =
            share_to_amount(
                vector::singleton(1u8),
                &metadata,
                &bigdecimal::from_ratio_u64(2, 1)
            );
        assert!(amount == 1u64, 0);
    }

    #[test]
    public fun test_staking_amount_to_share() acquires ModuleStore {
        test_setup();

        let metadata = staking_metadata_for_test();
        let validator = vector::singleton(1u8);
        set_staking_share_ratio(
            validator,
            &metadata,
            &bigdecimal::from_u64(100),
            50u64
        );

        let share = amount_to_share(validator, &metadata, 1);
        assert!(bigdecimal::truncate_u64(share) == 2u64, 0);
    }

    #[test(chain = @0x1, user = @0x1234)]
    public fun test_staking_slash_unbonding(
        chain: &signer, user: &signer
    ) acquires DelegationStore, ModuleStore {
        test_setup();

        let user_addr = signer::address_of(user);
        let validator = string::utf8(b"validator");

        let metadata = staking_metadata_for_test();

        fund_stake_coin(chain, user_addr, 1000000);

        set_block_info(100, 10000);
        set_staking_share_ratio(
            *string::bytes(&validator),
            &metadata,
            &bigdecimal::from_u64(1),
            1
        );

        register(user);
        delegate_script(user, metadata, validator, 100000);
        undelegate_script(user, metadata, validator, 10000);

        // undelegate trigger `deposit_unbonding_coin_for_chain`
        deposit_unbonding_coin_for_chain(
            chain,
            metadata,
            vector[validator],
            vector[10000]
        );
        slash_unbonding_for_chain(
            chain,
            metadata,
            validator,
            bigdecimal::from_ratio_u64(1, 10)
        ); // 10%

        let unbonding_response =
            get_unbonding(
                user_addr,
                metadata,
                validator,
                10000 + 7 * 24 * 60 * 60
            );
        assert!(unbonding_response.unbonding_amount == 9000, 1);
    }
}
