#[test_only]
module initia_std::ibctesting_utils {
    use std::string::{Self, String, utf8};
    use std::object::Object;
    use std::fungible_asset::{Self, Metadata};
    use std::vector;
    use std::managed_coin;
    use std::account;
    use std::coin;
    use std::option;
    use std::hash::sha3_256;
    use std::from_bcs::to_address;

    public fun counterparty_metadata(metadata: Object<Metadata>): Object<Metadata> {
        let counterparty_symbol = counterparty_symbol(metadata);
        coin::metadata(@std, counterparty_symbol)
    }

    public fun intermediate_sender(channel: String, sender: String): address {
        let seed = channel;
        string::append(&mut seed, sender);
        let seed_bytes = *string::bytes(&seed);
        let prefix_bytes = b"ibc-move-hook-intermediary";

        let buf = sha3_256(prefix_bytes);
        vector::append(&mut buf, seed_bytes);
        to_address(sha3_256(buf))
    }

    public fun counterparty_symbol(metadata: Object<Metadata>): String {
        let symbol = fungible_asset::symbol(metadata);
        let symbol_bytes = string::bytes(&symbol);
        let counterparty_symbol = vector::empty();
        vector::append(&mut counterparty_symbol, b"counterparty_");
        vector::append(&mut counterparty_symbol, *symbol_bytes);
        utf8(counterparty_symbol)
    }

    public fun create_counterparty_token(metadata: Object<Metadata>) {
        let chain_signer = account::create_signer_for_test(@std);
        let counterparty_symbol = counterparty_symbol(metadata);
        managed_coin::initialize(
            &chain_signer,
            option::none(),
            utf8(b"ibctesting"),
            counterparty_symbol,
            0u8,
            utf8(b""),
            utf8(b"")
        );
    }
}
