module initia_std::bech32 {
    use initia_std::string::String;

    native public fun encode(prefix: String, data: vector<u8>): String;
    native public fun decode(addr: String): (String, vector<u8>);

    #[test_only]
    use initia_std::string;

    #[test]
    fun test_bech32_encode() {
        let prefix = string::utf8(b"init");
        let data = x"12eafdba79c3dd7b90e3712ee475423153a722c7";
        let got = encode(prefix, data);
        let expected = string::utf8(b"init1zt40mwnec0whhy8rwyhwga2zx9f6wgk8p3x098");
        assert!(got == expected, 0);

        let prefix = string::utf8(b"celestia");
        let data = x"12eafdba79c3dd7b90e3712ee475423153a722c7";
        let got = encode(prefix, data);
        let expected = string::utf8(b"celestia1zt40mwnec0whhy8rwyhwga2zx9f6wgk87dhv5g");
        assert!(got == expected, 1);
    }

    #[test]
    fun test_bech32_decode() {
        let addr = string::utf8(b"init1zt40mwnec0whhy8rwyhwga2zx9f6wgk8p3x098");
        let (prefix, data) = decode(addr);
        assert!(prefix == string::utf8(b"init"), 0);
        assert!(data == x"12eafdba79c3dd7b90e3712ee475423153a722c7", 1);

        let addr = string::utf8(b"celestia1zt40mwnec0whhy8rwyhwga2zx9f6wgk87dhv5g");
        let (prefix, data) = decode(addr);
        assert!(prefix == string::utf8(b"celestia"), 2);
        assert!(data == x"12eafdba79c3dd7b90e3712ee475423153a722c7", 3);
    }
}
