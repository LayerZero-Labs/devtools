module oapp::utils {
    use std::string::{Self, String};
    use std::vector;
    use aptos_std::from_bcs;
    use aptos_std::bcs;

    const ASCII_ZERO: u8 = 48;
    const ASCII_NINE: u8 = 57;
    const ASCII_UPPERCASE_A: u8 = 65;
    const ASCII_UPPERCASE_F: u8 = 70;
    const ASCII_LOWERCASE_A: u8 = 97;
    const ASCII_LOWERCASE_F: u8 = 102;

    /// Converts a UTF-8 string to a vector of bytes
    public fun string_to_bytes(str: String): vector<u8> {
        *string::bytes(&str)
    }

    /// Converts a hex string (without 0x prefix) to a vector of bytes
    /// Example: "48656c6c6f" -> b"Hello"
    /// Aborts if the hex string has odd length (not properly formatted)
    public fun hex_string_to_bytes(hex_str: String): vector<u8> {
        let hex_bytes = string::bytes(&hex_str);
        let len = vector::length(hex_bytes);
        
        // Assert that hex string has even length
        assert!(len % 2 == 0, EINVALID_HEX_LENGTH);
        
        let result = vector[];
        let i = 0;
        while (i < len) {
            let high_nibble = hex_char_to_u8(*vector::borrow(hex_bytes, i));
            let low_nibble = hex_char_to_u8(*vector::borrow(hex_bytes, i + 1));
            let byte_val = (high_nibble << 4) | low_nibble;
            vector::push_back(&mut result, byte_val);
            i = i + 2;
        };
        result
    }

    /// Converts bytes to a hex string (lowercase)
    public fun bytes_to_hex_string(bytes: vector<u8>): String {
        let hex_chars = b"0123456789abcdef";
        let result = vector[];
        
        let i = 0;
        let len = vector::length(&bytes);
        while (i < len) {
            let byte = *vector::borrow(&bytes, i);
            let high = (byte >> 4) & 0x0f;
            let low = byte & 0x0f;
            vector::push_back(&mut result, *vector::borrow(&hex_chars, (high as u64)));
            vector::push_back(&mut result, *vector::borrow(&hex_chars, (low as u64)));
            i = i + 1;
        };
        
        string::utf8(result)
    }

    /// Helper function to convert a hex character to u8
    fun hex_char_to_u8(char: u8): u8 {
        if (char >= ASCII_ZERO && char <= ASCII_NINE) {
            char - ASCII_ZERO
        } else if (char >= ASCII_UPPERCASE_A && char <= ASCII_UPPERCASE_F) {
            char - ASCII_UPPERCASE_A + 10
        } else if (char >= ASCII_LOWERCASE_A && char <= ASCII_LOWERCASE_F) {
            char - ASCII_LOWERCASE_A + 10
        } else {
            abort EINVALID_HEX_CHARACTER
        }
    }

    // ================================================== Error Codes =================================================

    const EINVALID_HEX_CHARACTER: u64 = 1;
    const EINVALID_ADDRESS_LENGTH: u64 = 2;
    const EINVALID_HEX_LENGTH: u64 = 3;
} 