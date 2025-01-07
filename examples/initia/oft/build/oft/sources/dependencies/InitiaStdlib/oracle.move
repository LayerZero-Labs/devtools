module initia_std::oracle {
    use initia_std::string::{Self, String};

    #[view]
    public fun get_price(pair_id: String): (u256, u64, u64) {
        get_price_internal(*string::bytes(&pair_id))
    }

    native fun get_price_internal(pair_id: vector<u8>): (u256, u64, u64);

    #[test_only]
    public fun set_price(
        pair_id: &String,
        price: u256,
        updated_at: u64,
        decimals: u64
    ) {
        set_price_internal(
            *string::bytes(pair_id),
            price,
            updated_at,
            decimals
        )
    }

    #[test_only]
    native fun set_price_internal(
        pair_id: vector<u8>,
        price: u256,
        updated_at: u64,
        decimals: u64
    );

    #[test]
    public fun test_get_price() {
        let btc_usd_pair_id = string::utf8(b"BITCOIN/USD");
        let eth_usd_pair_id = string::utf8(b"ETHEREUM/USD");

        let btc_price = 100_00000000_u256;
        let eth_price = 10_000000000000000000_u256;

        let btc_updated_at = 1000002;
        let eth_updated_at = 1000001;

        let btc_decimals = 8;
        let eth_decimals = 18;

        set_price(
            &btc_usd_pair_id,
            btc_price,
            btc_updated_at,
            btc_decimals
        );
        set_price(
            &eth_usd_pair_id,
            eth_price,
            eth_updated_at,
            eth_decimals
        );

        let (price, updated_at, decimals) = get_price(btc_usd_pair_id);
        assert!(btc_price == price, 0);
        assert!(btc_updated_at == updated_at, 0);
        assert!(btc_decimals == decimals, 0);

        let (price, updated_at, decimals) = get_price(eth_usd_pair_id);
        assert!(eth_price == price, 0);
        assert!(eth_updated_at == updated_at, 0);
        assert!(eth_decimals == decimals, 0);
    }
}
