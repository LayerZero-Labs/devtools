module initia_std::hex {
    use std::string::{Self, String};
    use std::vector;
    use std::error;

    const UPPERA: u8 = 0x41;
    const LOWERA: u8 = 0x61;
    const ZERO: u8 = 0x30;

    const ENOT_HEXSTRING: u64 = 0x1;

    // encode bytes to hex string
    public fun encode_to_string(bz: &vector<u8>): String {
        let vec: vector<u8> = vector[];
        let len = vector::length(bz);
        let index = 0;
        while (index < len) {
            let val = *vector::borrow(bz, index);
            let h = val / 0x10;
            let l = val % 0x10;
            vector::push_back(&mut vec, encode_to_char(h));
            vector::push_back(&mut vec, encode_to_char(l));
            index = index + 1;
        };

        string::utf8(vec)
    }

    public fun encode_to_string_with_option(
        bz: &vector<u8>, is_upper: bool
    ): String {
        let vec: vector<u8> = vector[];
        let len = vector::length(bz);
        let index = 0;
        while (index < len) {
            let val = *vector::borrow(bz, index);
            vector::push_back(
                &mut vec,
                encode_to_char_with_option(val / 0x10, is_upper)
            );
            vector::push_back(
                &mut vec,
                encode_to_char_with_option(val % 0x10, is_upper)
            );
            index = index + 1;
        };

        string::utf8(vec)
    }

    // decode hex string to bytes
    public fun decode_string(str: &String): vector<u8> {
        assert!(
            is_hex_string(str),
            error::invalid_argument(ENOT_HEXSTRING)
        );

        let vec: vector<u8> = vector[];
        let bz = string::bytes(str);
        let len = vector::length(bz);
        if (len == 0) {
            return vec
        };

        let index =
            if (len % 2 == 1) {
                let l = decode_char(*vector::borrow(bz, 0));
                vector::push_back(&mut vec, l);

                1
            } else { 0 };

        while (index < len) {
            let h = decode_char(*vector::borrow(bz, index));
            let l = decode_char(*vector::borrow(bz, index + 1));

            vector::push_back(&mut vec, (h << 4) + l);
            index = index + 2
        };

        vec
    }

    fun encode_to_char(num: u8): u8 {
        if (num < 10) {
            ZERO + num
        } else {
            LOWERA + (num - 10)
        }
    }

    fun encode_to_char_with_option(num: u8, is_upper: bool): u8 {
        let adder = if (is_upper) { UPPERA }
        else { LOWERA };
        if (num < 10) {
            ZERO + num
        } else {
            adder + (num - 10)
        }
    }

    fun decode_char(num: u8): u8 {
        if (num >= LOWERA && num <= LOWERA + 5) {
            num - LOWERA + 10
        } else if (num >= UPPERA && num <= UPPERA + 5) {
            num - UPPERA + 10
        } else if (num >= ZERO && num <= ZERO + 9) {
            num - ZERO
        } else {
            abort error::invalid_argument(ENOT_HEXSTRING)
        }
    }

    fun is_hex_string(str: &String): bool {
        let bz = string::bytes(str);
        let len = vector::length(bz);

        let index = 0;
        while (index < len) {
            let char = *vector::borrow(bz, index);
            if (!is_hex_char(char)) {
                return false
            };
            index = index + 1;
        };

        true
    }

    fun is_hex_char(char: u8): bool {
        if (
            (char >= ZERO
                && char <= ZERO + 9) // 0 - 9
                || (char >= UPPERA
                    && char <= UPPERA + 5) // A - F
                || (char >= LOWERA
                    && char <= LOWERA + 5)) { // a - f
            return true
        };
        false
    }

    #[test]
    fun test_encode_to_string() {
        let raw_bytes = b"hello world!";
        let hex_string = encode_to_string(&raw_bytes);
        assert!(
            *string::bytes(&hex_string) == b"68656c6c6f20776f726c6421",
            0
        );

        // test odd bytes
        let odd_bytes = vector::empty<u8>();
        vector::push_back(&mut odd_bytes, 1);
        vector::push_back(&mut odd_bytes, (2 << 4) + 3);

        let hex_string = encode_to_string(&odd_bytes);
        assert!(*string::bytes(&hex_string) == b"0123", 0);
    }

    #[test]
    fun test_decode_string() {
        let hex_string = string::utf8(b"68656c6c6f20776f726c6421");
        let raw_bytes = decode_string(&hex_string);
        assert!(raw_bytes == b"hello world!", 0);

        // test odd bytes
        let odd_bytes = vector::empty<u8>();
        vector::push_back(&mut odd_bytes, 1);
        vector::push_back(&mut odd_bytes, (2 << 4) + 3);

        let hex_string = string::utf8(b"0123");
        let raw_bytes = decode_string(&hex_string);
        assert!(raw_bytes == odd_bytes, 0);
    }

    #[test]
    #[expected_failure(abort_code = 0x10001, location = Self)]
    fun test_decode_string_fail() {
        let not_hex_string = string::utf8(b"68656c6o6f20776f726l6421");
        decode_string(&not_hex_string);
    }

    #[test]
    #[expected_failure(abort_code = 0x10001, location = Self)]
    fun test_decode_string_fail2() {
        let not_hex_string = string::utf8(b"0g");
        decode_string(&not_hex_string);
    }

    #[test]
    #[expected_failure(abort_code = 0x10001, location = Self)]
    fun test_decode_char_fail() {
        decode_char(12);
    }
}
