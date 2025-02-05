/// The Internal store module for the OApp Core and Receive modules.
///
/// This module should generally not be modified by the OApp developer.
module oft::oapp_store {
    use std::signer::address_of;
    use std::table::{Self, Table};

    use endpoint_v2_common::bytes32::Bytes32;
    use endpoint_v2_common::contract_identity::{Self, CallRef, ContractSigner, create_contract_signer, DynamicCallRef};

    friend oft::oapp_core;
    friend oft::oapp_receive;
    friend oft::oapp_compose;
    friend oft::oft;

    // ************************************************* CONFIGURATION *************************************************

    public inline fun OAPP_ADDRESS(): address { @oft }

    // *********************************************** END CONFIGURATION ***********************************************

    struct OAppStore has key {
        contract_signer: ContractSigner,
        admin: address,
        peers: Table<u32, Bytes32>,
        delegate: address,
        enforced_options: Table<EnforcedOptionsKey, vector<u8>>,
    }

    struct EnforcedOptionsKey has store, copy, drop { eid: u32, msg_type: u16 }

    // =================================================== Call Ref ===================================================

    public(friend) fun call_ref<Target>(): CallRef<Target> acquires OAppStore {
        contract_identity::make_call_ref<Target>(&store().contract_signer)
    }

    public(friend) fun dynamic_call_ref(target: address, auth: vector<u8>): DynamicCallRef acquires OAppStore {
        contract_identity::make_dynamic_call_ref(&store().contract_signer, target, auth)
    }

    // =============================================== Enforced Options ===============================================

    public(friend) fun get_enforced_options(eid: u32, msg_type: u16): vector<u8> acquires OAppStore {
        *table::borrow_with_default(&store().enforced_options, EnforcedOptionsKey { eid, msg_type }, &b"")
    }

    public(friend) fun set_enforced_options(eid: u32, msg_type: u16, option: vector<u8>) acquires OAppStore {
        table::upsert(&mut store_mut().enforced_options, EnforcedOptionsKey { eid, msg_type }, option)
    }

    // ===================================================== Admin ====================================================

    public(friend) fun get_admin(): address acquires OAppStore { store().admin }

    public(friend) fun set_admin(admin: address) acquires OAppStore {
        store_mut().admin = admin;
    }

    // ===================================================== Peers ====================================================

    public(friend) fun has_peer(eid: u32): bool acquires OAppStore {
        table::contains(&store().peers, eid)
    }

    public(friend) fun get_peer(eid: u32): Bytes32 acquires OAppStore {
        *table::borrow(&store().peers, eid)
    }

    public(friend) fun set_peer(eid: u32, peer: Bytes32) acquires OAppStore {
        table::upsert(&mut store_mut().peers, eid, peer)
    }

    public(friend) fun remove_peer(eid: u32) acquires OAppStore {
        table::remove(&mut store_mut().peers, eid);
    }

    // =================================================== Delegate ===================================================

    public(friend) fun get_delegate(): address acquires OAppStore { store().delegate }

    public(friend) fun set_delegate(delegate: address) acquires OAppStore {
        store_mut().delegate = delegate;
    }

    // ===================================================== Misc =====================================================

    inline fun store(): &OAppStore { borrow_global(OAPP_ADDRESS()) }

    inline fun store_mut(): &mut OAppStore { borrow_global_mut(OAPP_ADDRESS()) }

    // ================================================ Initialization ================================================

    fun init_module(account: &signer) {
        move_to<OAppStore>(account, OAppStore {
            contract_signer: create_contract_signer(account),
            admin: address_of(account),
            peers: table::new(),
            delegate: @0x0,
            enforced_options: table::new(),
        });
    }

    #[test_only]
    public fun init_module_for_test() {
        init_module(&std::account::create_signer_for_test(OAPP_ADDRESS()));
    }
}
