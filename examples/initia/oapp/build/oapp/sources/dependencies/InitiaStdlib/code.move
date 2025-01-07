module initia_std::code {
    use std::string::String;
    use std::error;
    use std::signer;
    use std::vector;
    use std::event;
    use std::option;

    use initia_std::object::{Self, Object};
    use initia_std::table::{Self, Table};
    use initia_std::simple_map;

    // ----------------------------------------------------------------------
    // Code Publishing

    struct ModuleStore has key {
        /// It is a list of addresses with permission to distribute contracts,
        /// and an empty list is interpreted as allowing anyone to distribute.
        allowed_publishers: vector<address>,

        /// The total number of modules published.
        total_modules: u64
    }

    struct MetadataStore has key {
        metadata: Table<String, ModuleMetadata>
    }

    /// Describes an upgrade policy
    struct ModuleMetadata has store, copy, drop {
        upgrade_policy: u8
    }

    #[event]
    struct ModulePublishedEvent has store, drop {
        module_id: String,
        upgrade_policy: u8
    }

    /// Cannot upgrade an immutable package.
    const EUPGRADE_IMMUTABLE: u64 = 0x1;

    /// Cannot downgrade a package's upgradability policy.
    const EUPGRADE_WEAKER_POLICY: u64 = 0x2;

    /// Upgrade policy is not specified.
    const EUPGRADE_POLICY_UNSPECIFIED: u64 = 0x3;

    /// The operation is expected to be executed by chain signer.
    const EINVALID_CHAIN_OPERATOR: u64 = 0x4;

    /// allowed_publishers argument is invalid.
    const EINVALID_ALLOWED_PUBLISHERS: u64 = 0x5;

    /// The module ID is duplicated.
    const EDUPLICATE_MODULE_ID: u64 = 0x6;

    /// Not the owner of the package registry.
    const ENOT_PACKAGE_OWNER: u64 = 0x7;

    /// `code_object` does not exist.
    const ECODE_OBJECT_DOES_NOT_EXIST: u64 = 0x8;

    /// Dependency could not be resolved to any published package.
    const EPACKAGE_DEP_MISSING: u64 = 0x9;

    /// A dependency cannot have a weaker upgrade policy.
    const EDEP_WEAKER_POLICY: u64 = 0xA;

    /// Whether a compatibility check should be performed for upgrades. The check only passes if
    /// a new module has (a) the same public functions (b) for existing resources, no layout change.
    const UPGRADE_POLICY_COMPATIBLE: u8 = 1;

    /// Whether the modules in the package are immutable and cannot be upgraded.
    const UPGRADE_POLICY_IMMUTABLE: u8 = 2;

    /// Whether the upgrade policy can be changed. In general, the policy can be only
    /// strengthened but not weakened.
    public fun can_change_upgrade_policy_to(from: u8, to: u8): bool {
        from <= to
    }

    fun init_module(chain: &signer) {
        move_to(
            chain,
            ModuleStore { allowed_publishers: vector[], total_modules: 0 }
        );
    }

    // view functions

    #[view]
    public fun allowed_publishers(): vector<address> acquires ModuleStore {
        let module_store = borrow_global<ModuleStore>(@initia_std);
        module_store.allowed_publishers
    }

    #[view]
    public fun total_modules(): u64 acquires ModuleStore {
        let module_store = borrow_global<ModuleStore>(@initia_std);
        module_store.total_modules
    }

    // entry public functions

    #[deprecated]
    public entry fun publish(
        owner: &signer,
        _module_ids: vector<String>, // unused
        code: vector<vector<u8>>,
        upgrade_policy: u8
    ) {
        publish_v2(owner, code, upgrade_policy);
    }

    public entry fun publish_v2(
        owner: &signer, code: vector<vector<u8>>, upgrade_policy: u8
    ) {
        request_publish(signer::address_of(owner), code, upgrade_policy)
    }

    /// This function can be called by the chain to set the allowed publishers.
    public entry fun set_allowed_publishers(
        chain: &signer, allowed_publishers: vector<address>
    ) acquires ModuleStore {
        assert!(
            signer::address_of(chain) == @initia_std,
            error::permission_denied(EINVALID_CHAIN_OPERATOR)
        );
        assert_allowed(&allowed_publishers, @initia_std);

        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        module_store.allowed_publishers = allowed_publishers;
    }

    // public functions

    public fun freeze_code_object(
        publisher: &signer, code_object: Object<MetadataStore>
    ) acquires MetadataStore {
        let code_object_addr = object::object_address(&code_object);
        assert!(
            exists<MetadataStore>(code_object_addr),
            error::not_found(ECODE_OBJECT_DOES_NOT_EXIST)
        );
        assert!(
            object::is_owner(code_object, signer::address_of(publisher)),
            error::permission_denied(ENOT_PACKAGE_OWNER)
        );

        let registry = borrow_global_mut<MetadataStore>(code_object_addr);
        let iter = table::iter_mut(
            &mut registry.metadata,
            option::none(),
            option::none(),
            1
        );
        loop {
            if (!table::prepare_mut(iter)) { break };

            let (_, metadata) = table::next_mut(iter);
            metadata.upgrade_policy = UPGRADE_POLICY_IMMUTABLE;
        }
    }

    // private functions

    fun increase_total_modules(num_modules: u64) acquires ModuleStore {
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        module_store.total_modules = module_store.total_modules + num_modules;
    }

    fun assert_allowed(
        allowed_publishers: &vector<address>, addr: address
    ) {
        assert!(
            vector::is_empty(allowed_publishers)
                || vector::contains(allowed_publishers, &addr),
            error::invalid_argument(EINVALID_ALLOWED_PUBLISHERS)
        )
    }

    fun assert_no_duplication(module_ids: &vector<String>) {
        let module_ids_set = simple_map::create<String, bool>();
        vector::for_each_ref(
            module_ids,
            |module_id| {
                assert!(
                    !simple_map::contains_key(&module_ids_set, module_id),
                    error::invalid_argument(EDUPLICATE_MODULE_ID)
                );
                simple_map::add(&mut module_ids_set, *module_id, true);
            }
        );
    }

    /// This function is called by the genesis session to initialize the metadata store of
    /// stdlib modules.
    fun init_genesis(
        chain: &signer, module_ids: vector<String>, allowed_publishers: vector<address>
    ) acquires ModuleStore {
        assert!(
            signer::address_of(chain) == @initia_std,
            error::permission_denied(EINVALID_CHAIN_OPERATOR)
        );
        assert_no_duplication(&module_ids);

        let metadata_table = table::new<String, ModuleMetadata>();
        vector::for_each_ref(
            &module_ids,
            |module_id| {
                table::add<String, ModuleMetadata>(
                    &mut metadata_table,
                    *module_id,
                    ModuleMetadata { upgrade_policy: UPGRADE_POLICY_COMPATIBLE }
                );
            }
        );

        move_to<MetadataStore>(
            chain,
            MetadataStore { metadata: metadata_table }
        );

        set_allowed_publishers(chain, allowed_publishers);
        increase_total_modules(vector::length(&module_ids));
    }

    /// This function is called by the publish session to verify the publish request
    /// and to update the upgrade policy of the modules.
    fun verify_publish_request(
        publisher: &signer,
        module_ids: vector<String>,
        vec_dependency_addresses: vector<vector<address>>,
        vec_dependency_ids: vector<vector<String>>,
        upgrade_policy: u8
    ) acquires ModuleStore, MetadataStore {
        verify_modules_upgrade_policy(publisher, module_ids, upgrade_policy);
        verify_dependencies_upgrade_policy(
            vec_dependency_addresses,
            vec_dependency_ids,
            upgrade_policy
        );
    }

    /// Verify the upgrade policy of the modules and record the upgrade policy in the metadata store
    /// and update the total_modules count.
    fun verify_modules_upgrade_policy(
        publisher: &signer, module_ids: vector<String>, // 0x1::coin
        upgrade_policy: u8
    ) acquires ModuleStore, MetadataStore {
        assert_no_duplication(&module_ids);

        // Check whether arbitrary publish is allowed or not.
        let module_store = borrow_global_mut<ModuleStore>(@initia_std);
        assert!(
            upgrade_policy == UPGRADE_POLICY_COMPATIBLE
                || upgrade_policy == UPGRADE_POLICY_IMMUTABLE,
            error::invalid_argument(EUPGRADE_POLICY_UNSPECIFIED)
        );

        let addr = signer::address_of(publisher);
        assert_allowed(&module_store.allowed_publishers, addr);

        if (!exists<MetadataStore>(addr)) {
            move_to<MetadataStore>(publisher, MetadataStore { metadata: table::new() });
        };

        // Check upgradability
        let new_modules = 0;
        let metadata_table = &mut borrow_global_mut<MetadataStore>(addr).metadata;
        vector::for_each_ref(
            &module_ids,
            |module_id| {
                if (table::contains<String, ModuleMetadata>(metadata_table, *module_id)) {
                    let metadata =
                        table::borrow_mut<String, ModuleMetadata>(
                            metadata_table, *module_id
                        );
                    assert!(
                        metadata.upgrade_policy < UPGRADE_POLICY_IMMUTABLE,
                        error::invalid_argument(EUPGRADE_IMMUTABLE)
                    );
                    assert!(
                        can_change_upgrade_policy_to(
                            metadata.upgrade_policy, upgrade_policy
                        ),
                        error::invalid_argument(EUPGRADE_WEAKER_POLICY)
                    );

                    metadata.upgrade_policy = upgrade_policy;
                } else {
                    table::add<String, ModuleMetadata>(
                        metadata_table,
                        *module_id,
                        ModuleMetadata { upgrade_policy }
                    );
                    new_modules = new_modules + 1;
                };

                event::emit(
                    ModulePublishedEvent { module_id: *module_id, upgrade_policy }
                );
            }
        );

        if (new_modules > 0) {
            increase_total_modules(new_modules)
        };
    }

    /// Verify the dependencies upgrade policy have higher policy than the module itself.
    /// The function will be called at module publish verification step by session.
    fun verify_dependencies_upgrade_policy(
        vec_dependency_addresses: vector<vector<address>>,
        vec_dependency_ids: vector<vector<String>>,
        upgrade_policy: u8
    ) acquires MetadataStore {
        while (vector::length(&vec_dependency_addresses) > 0) {
            let dependency_addresses = vector::pop_back(&mut vec_dependency_addresses);
            let dependency_ids = vector::pop_back(&mut vec_dependency_ids);

            while (vector::length(&dependency_addresses) > 0) {
                let dependency_addr = vector::pop_back(&mut dependency_addresses);
                let dependency_id = vector::pop_back(&mut dependency_ids);

                assert!(
                    exists<MetadataStore>(dependency_addr),
                    error::not_found(EPACKAGE_DEP_MISSING)
                );
                let dependency_metadata_store =
                    borrow_global<MetadataStore>(dependency_addr);

                assert!(
                    table::contains<String, ModuleMetadata>(
                        &dependency_metadata_store.metadata, dependency_id
                    ),
                    error::not_found(EPACKAGE_DEP_MISSING)
                );
                let dependency_upgrade_policy =
                    table::borrow<String, ModuleMetadata>(
                        &dependency_metadata_store.metadata, dependency_id
                    ).upgrade_policy;

                assert!(
                    dependency_upgrade_policy >= upgrade_policy,
                    error::invalid_argument(EDEP_WEAKER_POLICY)
                );
            };
        }
    }

    /// Native function to initiate module loading
    native fun request_publish(
        owner: address, code: vector<vector<u8>>, upgrade_policy: u8
    );
}
