/// This module contains the general/internal store of the OFT OApp.
///
/// This module should generally not be modified by the OFT/OApp developer. OFT specific data should be stored in the
/// implementation module.
module oft::oft_store {
    use oft::oapp_store::OAPP_ADDRESS;

    friend oft::oft_core;

    struct OftStore has key {
        // The shared decimals of the OFT across all chains
        shared_decimals: u8,
        // The multiplier to convert a shared decimals to a local decimals representation
        // i.e. 10^(localDecimals - sharedDecimals)
        decimal_conversion_rate: u64,
    }

    public(friend) fun decimal_conversion_rate(): u64 acquires OftStore {
        borrow_global<OftStore>(OAPP_ADDRESS()).decimal_conversion_rate
    }

    public(friend) fun shared_decimals(): u8 acquires OftStore {
        borrow_global<OftStore>(OAPP_ADDRESS()).shared_decimals
    }

    public(friend) fun initialize(account: &signer, shared_decimals: u8, decimal_conversion_rate: u64) {
        move_to(account, OftStore { shared_decimals, decimal_conversion_rate })
    }
}
