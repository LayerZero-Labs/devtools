/// This OApp Core module provides the common functionality for OApps to interact with the LayerZero Endpoint V2 module.
/// It gives the ability to send messages, set configurations, manage peers and delegates, and enforce options.
///
/// This should generally not need to be edited by OApp developers, except to update friend declarations to reflect
/// the modules that depend on the friend functions called in this module.
module oft::oapp_core {
    use std::event::emit;
    use std::fungible_asset::{FungibleAsset, Metadata};
    use std::object;
    use std::option::{Self, Option};
    use std::primary_fungible_store;
    use std::signer::address_of;
    use std::string::String;
    use std::vector;

    use endpoint_v2::endpoint::{Self, wrap_guid};
    use endpoint_v2::messaging_receipt::MessagingReceipt;
    use endpoint_v2_common::bytes32::{Bytes32, from_bytes32, to_bytes32, ZEROS_32_BYTES};
    use endpoint_v2_common::serde;
    use endpoint_v2_common::universal_config::get_zro_metadata;
    use oft::oapp_store::{Self, OAPP_ADDRESS};

    friend oft::oft;

    #[test_only]
    friend oft::oapp_core_tests;
    #[test_only]
    friend oft::oft_core_tests;

    // ==================================================== Send ===================================================

    /// This handles sending a message to a remote OApp on the configured peer
    public(friend) fun lz_send(
        dst_eid: u32,
        message: vector<u8>,
        options: vector<u8>,
        native_fee: &mut FungibleAsset,
        zro_fee: &mut Option<FungibleAsset>,
    ): MessagingReceipt {
        endpoint::send(
            &oapp_store::call_ref(),
            dst_eid,
            get_peer_bytes32(dst_eid),
            message,
            options,
            native_fee,
            zro_fee,
        )
    }

    #[view]
    /// This provides a LayerZero quote for sending a message
    public fun lz_quote(
        dst_eid: u32,
        message: vector<u8>,
        options: vector<u8>,
        pay_in_zro: bool,
    ): (u64, u64) {
        endpoint::quote(OAPP_ADDRESS(), dst_eid, get_peer_bytes32(dst_eid), message, options, pay_in_zro)
    }

    // ==================================================== Compose ===================================================

    public(friend) fun lz_send_compose(
        to: address,
        index: u16,
        guid: Bytes32,
        message: vector<u8>,
    ) {
        endpoint::send_compose(&oapp_store::call_ref(), to, index, guid, message);
    }

    // ================================================ Delegated Calls ===============================================

    /// Asserts that the delegated call is authorized, either as the OApp address or the assigned delegate
    fun assert_authorized(account: address) {
        assert!(account == OAPP_ADDRESS() || account == oapp_store::get_delegate(), EUNAUTHORIZED);
    }

    /// Set the OApp configuration for a Message Library
    public entry fun set_config(
        account: &signer,
        msglib: address,
        config_type: u32,
        config: vector<u8>,
    ) {
        assert_authorized(address_of(move account));
        endpoint::set_config(&oapp_store::call_ref(), msglib, config_type, config)
    }

    /// Set the Send Library for an OApp
    public entry fun set_send_library(
        account: &signer,
        remote_eid: u32,
        msglib: address,
    ) {
        assert_authorized(address_of(move account));
        endpoint::set_send_library(&oapp_store::call_ref(), remote_eid, msglib)
    }

    /// Set the Receive Library for an OApp
    public entry fun set_receive_library(
        account: &signer,
        remote_eid: u32,
        msglib: address,
        grace_period: u64,
    ) {
        assert_authorized(address_of(move account));
        endpoint::set_receive_library(&oapp_store::call_ref(), remote_eid, msglib, grace_period)
    }

    /// Update the Receive Library Expiry for an OApp
    public entry fun set_receive_library_timeout(
        account: &signer,
        remote_eid: u32,
        msglib: address,
        expiry: u64,
    ) {
        assert_authorized(address_of(move account));
        endpoint::set_receive_library_timeout(&oapp_store::call_ref(), remote_eid, msglib, expiry)
    }

    /// Register a Receive Pathway for an OApp
    public entry fun register_receive_pathway(
        account: &signer,
        src_eid: u32,
        src_oapp: vector<u8>,
    ) {
        assert_authorized(address_of(move account));
        endpoint::register_receive_pathway(&oapp_store::call_ref(), src_eid, to_bytes32(src_oapp))
    }

    /// Clear an OApp message
    public entry fun clear(
        account: &signer,
        src_eid: u32,
        sender: vector<u8>,
        nonce: u64,
        guid: vector<u8>,
        message: vector<u8>,
    ) {
        assert_authorized(address_of(move account));
        endpoint::clear(
            &oapp_store::call_ref(),
            src_eid,
            to_bytes32(sender),
            nonce,
            wrap_guid(to_bytes32(guid)),
            message,
        )
    }

    /// Skip an OApp message
    public entry fun skip(
        account: &signer,
        src_eid: u32,
        sender: vector<u8>,
        nonce: u64,
    ) {
        assert_authorized(address_of(move account));
        endpoint::skip(&oapp_store::call_ref(), src_eid, to_bytes32(sender), nonce)
    }

    /// Burn an OApp message
    public entry fun burn(
        account: &signer,
        src_eid: u32,
        sender: vector<u8>,
        nonce: u64,
        payload_hash: vector<u8>,
    ) {
        assert_authorized(address_of(move account));
        endpoint::burn(&oapp_store::call_ref(), src_eid, to_bytes32(sender), nonce, to_bytes32(payload_hash))
    }

    /// Nilify an OApp message
    public entry fun nilify(
        account: &signer,
        src_eid: u32,
        sender: vector<u8>,
        nonce: u64,
        payload_hash: vector<u8>,
    ) {
        assert_authorized(address_of(move account));
        endpoint::nilify(&oapp_store::call_ref(), src_eid, to_bytes32(sender), nonce, to_bytes32(payload_hash))
    }

    // =============================================== Enforced Options ===============================================

    #[view]
    public fun get_enforced_options(eid: u32, msg_type: u16): vector<u8> {
        oapp_store::get_enforced_options(eid, msg_type)
    }

    public entry fun set_enforced_options(
        account: &signer,
        eid: u32,
        msg_type: u16,
        enforced_options: vector<u8>,
    ) {
        assert_admin(address_of(move account));
        assert_options_type_3(enforced_options);
        oapp_store::set_enforced_options(eid, msg_type, enforced_options);
        emit(EnforcedOptionSet { eid, msg_type, enforced_options });
    }

    #[view]
    public fun combine_options(eid: u32, msg_type: u16, extra_options: vector<u8>): vector<u8> {
        let enforced_options = get_enforced_options(eid, msg_type);
        if (vector::is_empty(&enforced_options)) { return extra_options };
        if (vector::is_empty(&extra_options)) { return enforced_options };
        assert_options_type_3(extra_options);
        vector::append(&mut enforced_options, serde::extract_bytes_until_end(&extra_options, &mut 2));
        enforced_options
    }

    // ===================================================== Admin ====================================================

    #[view]
    public fun get_admin(): address {
        oapp_store::get_admin()
    }

    public entry fun transfer_admin(account: &signer, new_admin: address) {
        let admin = address_of(move account);
        assert_admin(admin);
        assert!(std::account::exists_at(new_admin), EINVALID_ACCOUNT);
        oapp_store::set_admin(new_admin);
        emit(AdminTransferred { admin: new_admin });
    }

    public entry fun renounce_admin(account: &signer) {
        let admin = address_of(move account);
        assert_admin(admin);
        oapp_store::set_admin(@0x0);
        emit(AdminTransferred { admin: @0x0 });
    }

    public(friend) fun assert_admin(admin: address) {
        assert!(admin == oapp_store::get_admin(), EUNAUTHORIZED);
    }

    // ===================================================== Peers ====================================================

    #[view]
    public fun has_peer(eid: u32): bool {
        oapp_store::has_peer(eid)
    }

    #[view]
    public fun get_peer(eid: u32): vector<u8> {
        from_bytes32(get_peer_bytes32(eid))
    }

    public fun get_peer_bytes32(eid: u32): Bytes32 {
        assert!(oapp_store::has_peer(eid), EUNCONFIGURED_PEER);
        oapp_store::get_peer(eid)
    }

    public entry fun set_peer(account: &signer, eid: u32, peer: vector<u8>) {
        assert_admin(address_of(move account));
        // Automatically register the receive pathway when a peer is set
        endpoint::register_receive_pathway(&oapp_store::call_ref(), eid, to_bytes32(peer));
        // Set the peer
        let peer_bytes32 = to_bytes32(peer);
        oapp_store::set_peer(eid, peer_bytes32);
        emit(PeerSet { eid, peer });
    }

    public entry fun remove_peer(account: &signer, eid: u32) {
        assert_admin(address_of(move account));
        assert!(oapp_store::has_peer(eid), EUNCONFIGURED_PEER);
        oapp_store::remove_peer(eid);
        emit(PeerSet { eid, peer: ZEROS_32_BYTES() });
    }

    // =================================================== Delegates ==================================================

    #[view]
    public fun has_delegate(): bool {
        oapp_store::get_delegate() != @0x0
    }

    #[view]
    public fun get_delegate(): address {
        oapp_store::get_delegate()
    }

    /// Set the delegate address for the OApp - set to @0x0 to remove the delegate
    public entry fun set_delegate(account: &signer, delegate: address) {
        assert_admin(address_of(move account));
        oapp_store::set_delegate(delegate);
        emit(DelegateSet { delegate });
    }

    // ==================================================== General ===================================================

    #[view]
    public fun get_lz_receive_module_name(): String {
        endpoint::get_lz_receive_module(oft::oapp_store::OAPP_ADDRESS())
    }

    #[view]
    public fun get_lz_compose_module_name(): String {
        endpoint::get_lz_compose_module(oft::oapp_store::OAPP_ADDRESS())
    }

    // ===================================================== Utils ====================================================

    /// Utility function to withdraw the specified native and zro fees from the provided account
    public fun withdraw_lz_fees(
        account: &signer,
        native_fee: u64,
        zro_fee: u64,
    ): (FungibleAsset, Option<FungibleAsset>) {
        let native_metadata = object::address_to_object<Metadata>(@native_token_metadata_address);
        let native_fee_fa = primary_fungible_store::withdraw(account, native_metadata, native_fee);
        let zro_fee_fa = if (zro_fee > 0) {
            option::some(primary_fungible_store::withdraw(account, get_zro_metadata(), zro_fee))
        } else option::none();
        (native_fee_fa, zro_fee_fa)
    }

    /// Utility function to refund the specified fees to the provided account address
    public fun refund_fees(account: address, native_fee_fa: FungibleAsset, zro_fee_fa: Option<FungibleAsset>) {
        primary_fungible_store::deposit(account, native_fee_fa);
        option::destroy(zro_fee_fa, |zro_fee_fa| primary_fungible_store::deposit(account, zro_fee_fa));
    }

    // ==================================================== Helpers ===================================================

    /// Assert that an option is a type 3 option (begins with 0x0003)
    public fun assert_options_type_3(options: vector<u8>) {
        assert!(vector::length(&options) >= 2, EINVALID_OPTIONS);
        let options_type = serde::extract_u16(&options, &mut 0);
        assert!(options_type == 3, EINVALID_OPTIONS);
    }

    // ==================================================== Events ====================================================

    #[event]
    struct AdminTransferred has drop, store {
        admin: address,
    }

    #[event]
    struct PeerSet has drop, store {
        eid: u32,
        // Peer address - all zeros (0x00*32) if unset
        peer: vector<u8>,
    }

    #[event]
    struct DelegateSet has drop, store {
        delegate: address,
    }

    #[event]
    struct EnforcedOptionSet has drop, store {
        eid: u32,
        msg_type: u16,
        enforced_options: vector<u8>,
    }

    #[test_only]
    public fun admin_transferred_event(admin: address): AdminTransferred {
        AdminTransferred { admin }
    }

    #[test_only]
    public fun peer_set_event(eid: u32, peer: vector<u8>): PeerSet {
        PeerSet { eid, peer }
    }

    #[test_only]
    public fun delegate_set_event(delegate: address): DelegateSet {
        DelegateSet { delegate }
    }

    #[test_only]
    public fun enforced_option_set_event(eid: u32, msg_type: u16, enforced_options: vector<u8>): EnforcedOptionSet {
        EnforcedOptionSet { eid, msg_type, enforced_options }
    }

    // ================================================== Error Codes =================================================

    const EUNAUTHORIZED: u64 = 1;
    const EUNCONFIGURED_PEER: u64 = 2;
    const EUNEXPECTED_LZ_RECEIVE_VALUE: u64 = 3;
    const EINVALID_OPTIONS: u64 = 4;
    const EINVALID_ACCOUNT: u64 = 5;
}
