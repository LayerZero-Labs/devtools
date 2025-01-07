module initia_std::multisig {
    use std::error;
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::event;

    use initia_std::block::get_block_info;
    use initia_std::cosmos::{move_execute, move_execute_with_json};
    use initia_std::object::{Self, ExtendRef};
    use initia_std::simple_map::{Self, SimpleMap};
    use initia_std::table::{Self, Table};

    // errors

    const EINVALID_THRESHOLD: u64 = 1;

    const ENOT_MEMBER: u64 = 2;

    const EOLD_CONFIG_VERSION: u64 = 3;

    const EINVALID_PROPOSAL_STATUS: u64 = 4;

    const EPROPOSAL_EXPIRED: u64 = 5;

    const EUPDATE_CONFIG_PROPOSAL_ALREADY_EXISTS: u64 = 6;

    const EPROPOSAL_ALREADY_EXISTS: u64 = 7;

    const ENOT_PASS: u64 = 8;

    const EPROPOSAL_NOT_FOUND: u64 = 9;

    // constants

    const STATUS: vector<vector<u8>> = vector[b"in voting period", b"executed", b"expired"];

    const MAX_LIMIT: u8 = 30;

    // structs

    /// `Period` represents a time period with optional expiry conditions.
    /// If both `height` and `timestamp` are `None`, the period is considered to never expire.
    /// If both `height` and `timestamp` are set, and only one of them has expired, the period is considered expired.
    struct Period has copy, drop, store {
        height: Option<u64>,
        timestamp: Option<u64>
    }

    struct MultisigWallet has key {
        extend_ref: ExtendRef,
        config_version: u64, // config version
        members: vector<address>, // members of multisig account
        threshold: u64, // require votes to pass
        max_voting_period: Period, // max voting period
        proposals: Table<u64, Proposal>
    }

    struct Proposal has store {
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<vector<u8>>,
        config_version: u64,
        proposal_timestamp: u64,
        proposal_height: u64,
        votes: SimpleMap<address, bool>,
        status: u8,
        is_json: bool,
        json_args: vector<String>
    }

    // events

    #[event]
    struct CreateMultisigAccountEvent has drop, store {
        multisig_addr: address,
        members: vector<address>,
        threshold: u64,
        max_voting_period: Period
    }

    #[event]
    struct CreateProposalEvent has drop, store {
        multisig_addr: address,
        proposal_id: u64,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<vector<u8>>,
        config_version: u64
    }

    #[event]
    struct VoteProposalEvent has drop, store {
        multisig_addr: address,
        proposal_id: u64,
        voter: address,
        vote_yes: bool
    }

    #[event]
    struct ExecuteProposalEvent has drop, store {
        multisig_addr: address,
        proposal_id: u64,
        executor: address
    }

    #[event]
    struct UpdateConfigEvent has drop, store {
        multisig_addr: address,
        members: vector<address>,
        threshold: u64,
        max_voting_period: Period
    }

    // view function response struct

    struct ProposalResponse has drop {
        multisig_addr: address,
        proposal_id: u64,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<vector<u8>>,
        proposal_height: u64,
        proposal_timestamp: u64,
        config_version: u64,
        yes_vote_count: u64,
        status: String,
        is_json: bool,
        json_args: vector<String>
    }

    struct ConfigResponse has drop {
        multisig_addr: address,
        config_version: u64,
        members: vector<address>,
        threshold: u64,
        max_voting_period: Period
    }

    // view functions
    #[view]
    public fun get_proposal(
        multisig_addr: address, proposal_id: u64
    ): ProposalResponse acquires MultisigWallet {
        let multisig_wallet = borrow_global<MultisigWallet>(multisig_addr);
        let proposal = table::borrow(&multisig_wallet.proposals, proposal_id);
        proposal_to_proposal_response(
            multisig_wallet,
            multisig_addr,
            proposal_id,
            proposal
        )
    }

    #[view]
    public fun get_proposals(
        multisig_addr: address, start_after: Option<u64>, limit: u8
    ): vector<ProposalResponse> acquires MultisigWallet {
        if (limit > MAX_LIMIT) {
            limit = MAX_LIMIT
        };
        let res: vector<ProposalResponse> = vector[];
        let multisig_wallet = borrow_global<MultisigWallet>(multisig_addr);
        let iter = table::iter(
            &multisig_wallet.proposals,
            option::none(),
            start_after,
            2
        );

        while (vector::length(&res) < (limit as u64)
            && table::prepare<u64, Proposal>(iter)) {
            let (proposal_id, proposal) = table::next<u64, Proposal>(iter);
            vector::push_back(
                &mut res,
                proposal_to_proposal_response(
                    multisig_wallet,
                    multisig_addr,
                    proposal_id,
                    proposal
                )
            );
        };

        res
    }

    #[view]
    public fun get_config(multisig_addr: address): ConfigResponse acquires MultisigWallet {
        let multisig_wallet = borrow_global<MultisigWallet>(multisig_addr);

        ConfigResponse {
            multisig_addr,
            config_version: multisig_wallet.config_version,
            members: multisig_wallet.members,
            threshold: multisig_wallet.threshold,
            max_voting_period: multisig_wallet.max_voting_period
        }
    }

    // entry functions

    /// Create new multisig account
    public entry fun create_multisig_account(
        account: &signer,
        name: String, // name for make deterministic multisig address (account_addr + name)
        members: vector<address>,
        threshold: u64,
        max_voting_period_height: Option<u64>,
        max_voting_period_timestamp: Option<u64>
    ) {
        assert_member(&members, &signer::address_of(account));
        assert!(
            vector::length(&members) >= threshold,
            error::invalid_argument(EINVALID_THRESHOLD)
        );
        let constructor_ref = object::create_named_object(
            account, *string::bytes(&name)
        );
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let multisig_signer = object::generate_signer(&constructor_ref);
        let multisig_addr = signer::address_of(&multisig_signer);
        let max_voting_period = Period {
            height: max_voting_period_height,
            timestamp: max_voting_period_timestamp
        };
        let members_map = simple_map::create<address, bool>();
        vector::for_each(
            members,
            |member| simple_map::add(&mut members_map, member, true)
        ); // just for check uniqueness

        move_to(
            &multisig_signer,
            MultisigWallet {
                extend_ref,
                config_version: 1,
                members,
                threshold,
                max_voting_period,
                proposals: table::new()
            }
        );

        event::emit<CreateMultisigAccountEvent>(
            CreateMultisigAccountEvent {
                multisig_addr,
                members,
                threshold,
                max_voting_period
            }
        )
    }

    /// Create new proposal
    public entry fun create_proposal(
        account: &signer,
        multisig_addr: address,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<vector<u8>>
    ) acquires MultisigWallet {
        create_proposal_internal(
            account,
            multisig_addr,
            module_address,
            module_name,
            function_name,
            type_args,
            args,
            false,
            vector[]
        )
    }

    /// Create new proposal
    public entry fun create_proposal_with_json(
        account: &signer,
        multisig_addr: address,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<String>
    ) acquires MultisigWallet {
        create_proposal_internal(
            account,
            multisig_addr,
            module_address,
            module_name,
            function_name,
            type_args,
            vector[],
            true,
            args
        )
    }

    /// Vote proposal
    public entry fun vote_proposal(
        account: &signer,
        multisig_addr: address,
        proposal_id: u64,
        vote_yes: bool
    ) acquires MultisigWallet {
        let voter = signer::address_of(account);
        let multisig_wallet = borrow_global_mut<MultisigWallet>(multisig_addr);
        assert_member(&multisig_wallet.members, &voter);

        assert!(
            table::contains(&multisig_wallet.proposals, proposal_id),
            error::invalid_argument(EPROPOSAL_NOT_FOUND)
        );
        let proposal = table::borrow_mut(&mut multisig_wallet.proposals, proposal_id);

        assert_config_version(multisig_wallet.config_version, proposal);
        assert_proposal(&multisig_wallet.max_voting_period, proposal);

        vote(&mut proposal.votes, voter, vote_yes);

        event::emit<VoteProposalEvent>(
            VoteProposalEvent { multisig_addr, proposal_id, voter, vote_yes }
        )
    }

    /// Execute proposal
    public entry fun execute_proposal(
        account: &signer, multisig_addr: address, proposal_id: u64
    ) acquires MultisigWallet {
        let executor = signer::address_of(account);
        let multisig_wallet = borrow_global_mut<MultisigWallet>(multisig_addr);
        assert_member(&multisig_wallet.members, &executor);

        assert!(
            table::contains(&multisig_wallet.proposals, proposal_id),
            error::invalid_argument(EPROPOSAL_NOT_FOUND)
        );
        let proposal = table::borrow_mut(&mut multisig_wallet.proposals, proposal_id);

        assert_config_version(multisig_wallet.config_version, proposal);
        assert_proposal(&multisig_wallet.max_voting_period, proposal);

        // check passed
        assert!(
            yes_vote_count(&proposal.votes, &multisig_wallet.members)
                >= multisig_wallet.threshold,
            error::invalid_state(ENOT_PASS)
        );

        let multisig_signer =
            &object::generate_signer_for_extending(&multisig_wallet.extend_ref);

        if (!proposal.is_json) {
            move_execute(
                multisig_signer,
                proposal.module_address,
                proposal.module_name,
                proposal.function_name,
                proposal.type_args,
                proposal.args
            )
        } else {
            move_execute_with_json(
                multisig_signer,
                proposal.module_address,
                proposal.module_name,
                proposal.function_name,
                proposal.type_args,
                proposal.json_args
            )
        };

        proposal.status = 1; // executed

        event::emit<ExecuteProposalEvent>(
            ExecuteProposalEvent { multisig_addr, proposal_id, executor }
        )
    }

    /// Update config. Only execute by multisig wallet itself
    public entry fun update_config(
        account: &signer,
        new_members: vector<address>,
        new_threshold: u64,
        new_max_voting_period_height: Option<u64>,
        new_max_voting_period_timestamp: Option<u64>
    ) acquires MultisigWallet {
        let multisig_addr = signer::address_of(account);
        let multisig_wallet = borrow_global_mut<MultisigWallet>(multisig_addr);

        assert!(
            vector::length(&new_members) >= new_threshold,
            error::invalid_argument(EINVALID_THRESHOLD)
        );
        let new_members_map = simple_map::create<address, bool>();
        vector::for_each(
            new_members,
            |member| simple_map::add(&mut new_members_map, member, true)
        ); // just for check uniqueness
        let new_max_voting_period = Period {
            height: new_max_voting_period_height,
            timestamp: new_max_voting_period_timestamp
        };

        multisig_wallet.config_version = multisig_wallet.config_version + 1;
        multisig_wallet.members = new_members;
        multisig_wallet.threshold = new_threshold;
        multisig_wallet.max_voting_period = new_max_voting_period;

        event::emit<UpdateConfigEvent>(
            UpdateConfigEvent {
                multisig_addr,
                members: new_members,
                threshold: new_threshold,
                max_voting_period: new_max_voting_period
            }
        )
    }

    fun create_proposal_internal(
        account: &signer,
        multisig_addr: address,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<vector<u8>>,
        is_json: bool,
        json_args: vector<String>
    ) acquires MultisigWallet {
        let addr = signer::address_of(account);
        let multisig_wallet = borrow_global_mut<MultisigWallet>(multisig_addr);
        assert_member(&multisig_wallet.members, &addr);

        let (height, timestamp) = get_block_info();
        let config_version = multisig_wallet.config_version;

        let proposal = Proposal {
            module_address,
            module_name,
            function_name,
            type_args,
            args,
            config_version,
            proposal_height: height,
            proposal_timestamp: timestamp,
            votes: simple_map::create(),
            status: 0, // in voting period
            is_json,
            json_args
        };

        let proposal_id = table::length(&multisig_wallet.proposals) + 1;
        table::add(
            &mut multisig_wallet.proposals,
            proposal_id,
            proposal
        );

        event::emit<CreateProposalEvent>(
            CreateProposalEvent {
                multisig_addr,
                proposal_id,
                module_address,
                module_name,
                function_name,
                type_args,
                args,
                config_version
            }
        )
    }

    fun is_proposal_expired(
        max_period: &Period, proposal_height: u64, proposal_timestamp: u64
    ): bool {
        let (height, timestamp) = get_block_info();
        let expired_height =
            if (option::is_some(&max_period.height)) {
                let max_voting_period_height = *option::borrow(&max_period.height);
                (max_voting_period_height + proposal_height) >= height
            } else { false };

        let expired_timestamp =
            if (option::is_some(&max_period.timestamp)) {
                let max_voting_period_timestamp = *option::borrow(&max_period.timestamp);
                (max_voting_period_timestamp + proposal_timestamp) >= timestamp
            } else { false };

        expired_height || expired_timestamp
    }

    fun vote(
        votes: &mut SimpleMap<address, bool>,
        voter: address,
        vote_yes: bool
    ) {
        if (simple_map::contains_key(votes, &voter)) {
            let vote = simple_map::borrow_mut(votes, &voter);
            *vote = vote_yes;
        } else {
            simple_map::add(votes, voter, vote_yes);
        };
    }

    fun yes_vote_count(
        votes: &SimpleMap<address, bool>, members: &vector<address>
    ): u64 {
        let yes_count = 0;
        vector::for_each_ref(
            members,
            |member| {
                if (simple_map::contains_key(votes, member)
                    && *simple_map::borrow(votes, member)) {
                    yes_count = yes_count + 1;
                }
            }
        );

        yes_count
    }

    fun proposal_to_proposal_response(
        multisig_wallet: &MultisigWallet,
        multisig_addr: address,
        proposal_id: u64,
        proposal: &Proposal
    ): ProposalResponse {
        let status_index = proposal.status;
        let is_expired =
            is_proposal_expired(
                &multisig_wallet.max_voting_period,
                proposal.proposal_height,
                proposal.proposal_timestamp
            );
        let yes_vote_count = yes_vote_count(&proposal.votes, &multisig_wallet.members);
        if (status_index == 0 && is_expired) {
            status_index = 2
        };

        ProposalResponse {
            multisig_addr,
            proposal_id,
            module_address: proposal.module_address,
            module_name: proposal.module_name,
            function_name: proposal.function_name,
            type_args: proposal.type_args,
            args: proposal.args,
            proposal_height: proposal.proposal_height,
            proposal_timestamp: proposal.proposal_timestamp,
            config_version: proposal.config_version,
            yes_vote_count,
            status: string::utf8(*vector::borrow(&STATUS, (status_index as u64))),
            is_json: proposal.is_json,
            json_args: proposal.json_args
        }
    }

    inline fun assert_member(members: &vector<address>, member: &address) {
        assert!(
            vector::contains(members, member),
            error::permission_denied(ENOT_MEMBER)
        )
    }

    inline fun assert_config_version(
        multisig_wallet_config_version: u64, execute_proposal: &Proposal
    ) {
        assert!(
            multisig_wallet_config_version == execute_proposal.config_version,
            error::invalid_state(EOLD_CONFIG_VERSION)
        )
    }

    inline fun assert_proposal(
        max_voting_period: &Period, proposal: &Proposal
    ) {
        assert!(
            proposal.status == 0,
            error::invalid_state(EINVALID_PROPOSAL_STATUS)
        );
        assert!(
            !is_proposal_expired(
                max_voting_period,
                proposal.proposal_height,
                proposal.proposal_timestamp
            ),
            error::invalid_state(EPROPOSAL_EXPIRED)
        );
    }

    #[test_only]
    use initia_std::block::set_block_info;

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x50002, location = Self)]
    fun create_wallet_by_other(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);

        create_multisig_account(
            &account4,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::none(),
            option::none()
        );
    }

    #[test(account1 = @0x101, account2 = @0x102, account3 = @0x103)]
    #[expected_failure(abort_code = 0x10001, location = Self)]
    fun invalid_threshold(
        account1: signer, account2: signer, account3: signer
    ) {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            4,
            option::none(),
            option::none()
        );
    }

    #[test(account1 = @0x101, account2 = @0x102, account3 = @0x103)]
    #[expected_failure(abort_code = 0x10001, location = simple_map)]
    fun duplicated_member(
        account1: signer, account2: signer, account3: signer
    ) {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr1, addr2, addr3],
            3,
            option::none(),
            option::none()
        );
    }

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x50002, location = Self)]
    fun create_proposal_by_other(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);
        let addr4 = signer::address_of(&account4);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::none(),
            option::none()
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        create_proposal(
            &account4,
            multisig_addr,
            @initia_std,
            string::utf8(b"mltisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                std::bcs::to_bytes(&vector[addr1, addr2, addr4]),
                std::bcs::to_bytes(&3u64),
                std::bcs::to_bytes(&option::none<u64>()),
                std::bcs::to_bytes(&option::none<u64>())
            ]
        );
    }

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x50002, location = Self)]
    fun vote_by_other(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);
        let addr4 = signer::address_of(&account4);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::none(),
            option::none()
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        create_proposal(
            &account1,
            multisig_addr,
            @initia_std,
            string::utf8(b"mltisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                std::bcs::to_bytes(&vector[addr1, addr2, addr4]),
                std::bcs::to_bytes(&3u64),
                std::bcs::to_bytes(&option::none<u64>()),
                std::bcs::to_bytes(&option::none<u64>())
            ]
        );

        vote_proposal(&account4, multisig_addr, 1, true);
    }

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x30005, location = Self)]
    fun vote_after_height_expired(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);
        let addr4 = signer::address_of(&account4);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::some(10),
            option::some(10)
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        set_block_info(100, 100);
        create_proposal(
            &account1,
            multisig_addr,
            @initia_std,
            string::utf8(b"mltisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                std::bcs::to_bytes(&vector[addr1, addr2, addr4]),
                std::bcs::to_bytes(&3u64),
                std::bcs::to_bytes(&option::none<u64>()),
                std::bcs::to_bytes(&option::none<u64>())
            ]
        );

        set_block_info(111, 100);
        vote_proposal(&account1, multisig_addr, 1, true);
    }

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x30005, location = Self)]
    fun vote_after_timestamp_expired(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);
        let addr4 = signer::address_of(&account4);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::some(10),
            option::some(10)
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        set_block_info(100, 100);
        create_proposal(
            &account1,
            multisig_addr,
            @initia_std,
            string::utf8(b"mltisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                std::bcs::to_bytes(&vector[addr1, addr2, addr4]),
                std::bcs::to_bytes(&3u64),
                std::bcs::to_bytes(&option::none<u64>()),
                std::bcs::to_bytes(&option::none<u64>())
            ]
        );

        set_block_info(100, 111);
        vote_proposal(&account1, multisig_addr, 1, true);
    }

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x30008, location = Self)]
    fun execute_not_pass(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);
        let addr4 = signer::address_of(&account4);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::none(),
            option::none()
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        create_proposal(
            &account1,
            multisig_addr,
            @initia_std,
            string::utf8(b"mltisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                std::bcs::to_bytes(&vector[addr1, addr2, addr4]),
                std::bcs::to_bytes(&3u64),
                std::bcs::to_bytes(&option::none<u64>()),
                std::bcs::to_bytes(&option::none<u64>())
            ]
        );

        vote_proposal(&account1, multisig_addr, 1, true);
        vote_proposal(&account2, multisig_addr, 1, false);
        vote_proposal(&account3, multisig_addr, 1, false);

        execute_proposal(&account1, multisig_addr, 1);
    }

    #[test(
        account1 = @0x101, account2 = @0x102, account3 = @0x103, account4 = @0x104
    )]
    #[expected_failure(abort_code = 0x30003, location = Self)]
    fun execute_after_config_update(
        account1: signer,
        account2: signer,
        account3: signer,
        account4: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);
        let addr4 = signer::address_of(&account4);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::none(),
            option::none()
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        create_proposal(
            &account1,
            multisig_addr,
            @initia_std,
            string::utf8(b"mltisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                std::bcs::to_bytes(&vector[addr1, addr2, addr4]),
                std::bcs::to_bytes(&3u64),
                std::bcs::to_bytes(&option::none<u64>()),
                std::bcs::to_bytes(&option::none<u64>())
            ]
        );

        vote_proposal(&account1, multisig_addr, 1, true);
        vote_proposal(&account2, multisig_addr, 1, true);
        vote_proposal(&account3, multisig_addr, 1, false);

        let multisig_wallet = borrow_global<MultisigWallet>(multisig_addr);
        let multisig_signer =
            object::generate_signer_for_extending(&multisig_wallet.extend_ref);
        update_config(
            &multisig_signer,
            vector[addr1, addr2, addr4],
            2,
            option::none(),
            option::none()
        );

        execute_proposal(&account1, multisig_addr, 1);
    }

    #[test(account1 = @0x101, account2 = @0x102, account3 = @0x103)]
    fun proposal_with_json(
        account1: signer, account2: signer, account3: signer
    ) acquires MultisigWallet {
        // create multisig wallet
        let addr1 = signer::address_of(&account1);
        let addr2 = signer::address_of(&account2);
        let addr3 = signer::address_of(&account3);

        create_multisig_account(
            &account1,
            string::utf8(b"multisig wallet"),
            vector[addr1, addr2, addr3],
            2,
            option::none(),
            option::none()
        );
        let multisig_addr = object::create_object_address(&addr1, b"multisig wallet");

        create_proposal_with_json(
            &account1,
            multisig_addr,
            @initia_std,
            string::utf8(b"multisig"),
            string::utf8(b"update_config"),
            vector[],
            vector[
                string::utf8(b"[\"0x101\", \"0x102\", \"0x104\"]"),
                string::utf8(b"\"3\""),
                string::utf8(b""),
                string::utf8(b"")
            ]
        );

        let proposal = get_proposal(multisig_addr, 1);
        assert!(proposal.module_address == @initia_std, 0);
        assert!(
            proposal.module_name == string::utf8(b"multisig"),
            1
        );
        assert!(
            proposal.function_name == string::utf8(b"update_config"),
            2
        );
        assert!(proposal.type_args == vector[], 3);
        assert!(
            proposal.json_args
                == vector[
                    string::utf8(b"[\"0x101\", \"0x102\", \"0x104\"]"),
                    string::utf8(b"\"3\""),
                    string::utf8(b""),
                    string::utf8(b"")
                ],
            4
        );
        assert!(proposal.args == vector[], 5);
    }
}
