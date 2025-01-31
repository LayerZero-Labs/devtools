/// This is the OFT interface that provides send, quote, and view functions for the OFT.
///
/// The OFT developer should update the name of the implementation module in the configuration section of this module.
/// Other than that, this module generally does not need to be updated by the OFT developer. As much as possible,
/// customizations should be made in the OFT implementation module.
module oapp::oapp {
    use std::fungible_asset::{FungibleAsset};
    use std::option;
    use std::option::Option;
    use std::primary_fungible_store;
    use std::signer::address_of;

    use endpoint_v2_common::bytes32::Bytes32;
    use endpoint_v2_common::native_token;
    use oapp::oapp_core::{combine_options, lz_quote, lz_send, refund_fees};
    use oapp::oapp_store::OAPP_ADDRESS;

    friend oapp::oapp_receive;
    friend oapp::oapp_compose;

    const STANDARD_MESSAGE_TYPE: u16 = 1;

    struct Counter has key {
        value: u64
    }

    fun init_module(account: &signer) {
        move_to(account, Counter { value: 0 });
    }

    #[view]
    public fun get_counter(): u64 acquires Counter {
        borrow_global<Counter>(@oapp).value
    }

    public(friend) fun lz_receive_impl(
        _src_eid: u32,
        _sender: Bytes32,
        _nonce: u64,
        _guid: Bytes32,
        _message: vector<u8>,
        _extra_data: vector<u8>,
        receive_value: Option<FungibleAsset>,
    ) acquires Counter {
        // Deposit any received value
        option::destroy(receive_value, |value| primary_fungible_store::deposit(OAPP_ADDRESS(), value));

        // Increment counter
        let counter = borrow_global_mut<Counter>(@oapp);
        counter.value = counter.value + 1;

        // todo: Perform any actions with received message here
    }


    // todo: replicate the logic in here where sending a message must happen
    public entry fun example_message_sender(
        account: &signer,
        dst_eid: u32,
        message: vector<u8>,
        extra_options: vector<u8>,
        native_fee: u64,
    ) {
        // Check normal APT balance
        let bal = native_token::balance(address_of(account));
        assert!(bal >= native_fee, EINSUFFICIENT_BALANCE);

        // Withdraw using native_token module
        let native_fee_fa = native_token::withdraw(account, native_fee);

        // No ZRO fee in this example
        let zro_fee_fa = option::none();

        // Send the cross-chain message
        lz_send(
            dst_eid,
            message,
            combine_options(dst_eid, STANDARD_MESSAGE_TYPE, extra_options),
            &mut native_fee_fa,
            &mut zro_fee_fa,
        );

        // Refund any leftover fees back to the user
        refund_fees(address_of(account), native_fee_fa, zro_fee_fa);
    }

    #[view]
    /// Quote the network fees for a particular send
    /// @return (native_fee, zro_fee)
    // todo: replicate the logic in here where a quote is needed
    public fun example_message_quoter(
        dst_eid: u32,
        message: vector<u8>,
        extra_options: vector<u8>,
    ): (u64, u64) {
        let options = combine_options(dst_eid, STANDARD_MESSAGE_TYPE, extra_options);

        lz_quote(
            dst_eid,
            message,
            options,
            false,
        )
    }

    // ==================================================== Compose ===================================================

    public(friend) fun lz_compose_impl(
        _from: address,
        _guid: Bytes32,
        _index: u16,
        _message: vector<u8>,
        _extra_data: vector<u8>,
        _value: Option<FungibleAsset>,
    ) {
        // todo: Replace this function body with any actions that need to be run if this OApp receives a compose message
        // This only needs to be implemented if the OApp needs to *receive* composed messages
        abort ECOMPOSE_NOT_IMPLEMENTED
    }

    // =============================================== Ordered Execution ==============================================

    /// Provides the next nonce if executor options request ordered execution; returning 0 for disabled ordered
    /// execution
    public(friend) fun next_nonce_impl(_src_eid: u32, _sender: Bytes32): u64 {
        0
    }

    // ================================================== Error Codes =================================================

    const ECOMPOSE_NOT_IMPLEMENTED: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
}
