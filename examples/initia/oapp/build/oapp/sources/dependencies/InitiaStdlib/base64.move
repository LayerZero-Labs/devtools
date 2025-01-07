module initia_std::base64 {
    use std::string::{Self, String};

    public fun to_string(bytes: vector<u8>): String {
        string::utf8(encode(bytes))
    }

    public fun from_string(str: String): vector<u8> {
        decode(*string::bytes(&str))
    }

    native public fun encode(bytes: vector<u8>): vector<u8>;
    native public fun decode(bytes: vector<u8>): vector<u8>;
}
