module initia_std::address {
    use std::string::String;
    use std::bcs;
    use initia_std::from_bcs;
    use initia_std::query;
    use initia_std::json;

    struct FromSdkRequest has copy, drop {
        sdk_addr: String
    }

    struct FromSdkResponse has copy, drop {
        vm_addr: address
    }

    public fun from_sdk(sdk_addr: String): address {
        let res =
            json::unmarshal<FromSdkResponse>(
                query::query_custom(
                    b"from_sdk_address",
                    json::marshal(&FromSdkRequest { sdk_addr: sdk_addr })
                )
            );

        res.vm_addr
    }

    struct ToSdkRequest has copy, drop {
        vm_addr: address
    }

    struct ToSdkResponse has copy, drop {
        sdk_addr: String
    }

    public fun to_sdk(vm_addr: address): String {
        let res =
            json::unmarshal<ToSdkResponse>(
                query::query_custom(
                    b"to_sdk_address",
                    json::marshal(&ToSdkRequest { vm_addr: vm_addr })
                )
            );

        res.sdk_addr
    }

    #[test_only]
    use std::string;

    #[test]
    fun test_to_string() {
        let addr = @0x123abc;
        let addr_str =
            string::utf8(
                b"0x0000000000000000000000000000000000000000000000000000000000123abc"
            );
        assert!(to_string(addr) == addr_str, 0)
    }

    #[test]
    fun test_from_string() {
        let addr = @0x908def;
        let addr_str =
            string::utf8(
                b"0x0000000000000000000000000000000000000000000000000000000000908def"
            );
        assert!(from_string(addr_str) == addr, 0)
    }

    #[test]
    fun test_to_sdk() {
        let addr = @0x123abc;
        let addr_sdk = string::utf8(b"init1qqqqqqqqqqqqqqqqqqqqqqqqqqqpyw4utfmfp0");
        assert!(to_sdk(addr) == addr_sdk, 0)
    }

    #[test]
    fun test_from_sdk() {
        let addr = @0x123abc;
        let addr_sdk = string::utf8(b"init1qqqqqqqqqqqqqqqqqqqqqqqqqqqpyw4utfmfp0");
        assert!(addr == from_sdk(addr_sdk), 0)
    }

    // hex string <> address
    native public fun to_string(addr: address): String;
    native public fun from_string(addr_str: String): address;

    // bytes <> address
    public fun to_bytes(addr: address): vector<u8> {
        bcs::to_bytes(&addr)
    }

    public fun from_bytes(bytes: vector<u8>): address {
        from_bcs::to_address(bytes)
    }
}
