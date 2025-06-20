module oapp::utils {
    use std::string::{Self, String};
    use std::vector;
    use aptos_std::from_bcs;
    use aptos_std::bcs;

    /// Converts a vector of bytes to a UTF-8 string
    /// Will abort if the bytes are not valid UTF-8
    public fun bytes_to_string(bytes: vector<u8>): String {
        string::utf8(bytes)
    }

    /// Converts a UTF-8 string to a vector of bytes
    public fun string_to_bytes(str: String): vector<u8> {
        *string::bytes(&str)
    }

    /// Converts a hex string (without 0x prefix) to a vector of bytes
    /// Example: "48656c6c6f" -> b"Hello"
    /// Automatically pads odd-length strings with a leading zero
    public fun hex_string_to_bytes(hex_str: String): vector<u8> {
        let hex_bytes = string::bytes(&hex_str);
        let len = vector::length(hex_bytes);
        
        // If the hex string is odd length, pad with leading zero
        let padded_hex = if (len % 2 == 1) {
            let padded = vector::empty<u8>();
            vector::push_back(&mut padded, ASCII_ZERO);
            vector::append(&mut padded, *hex_bytes);
            padded
        } else {
            *hex_bytes
        };
        
        let padded_len = vector::length(&padded_hex);
        let result = vector::empty<u8>();
        let i = 0;
        while (i < padded_len) {
            let high_nibble = hex_char_to_u8(*vector::borrow(&padded_hex, i));
            let low_nibble = hex_char_to_u8(*vector::borrow(&padded_hex, i + 1));
            let byte_val = (high_nibble << 4) | low_nibble;
            vector::push_back(&mut result, byte_val);
            i = i + 2;
        };
        result
    }

    /// Converts bytes to a hex string (lowercase)
    public fun bytes_to_hex_string(bytes: vector<u8>): String {
        let hex_chars = b"0123456789abcdef";
        let result = vector::empty<u8>();
        
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

    const ASCII_ZERO: u8 = 48;
    const ASCII_NINE: u8 = 57;
    const ASCII_UPPERCASE_A: u8 = 65;
    const ASCII_UPPERCASE_F: u8 = 70;
    const ASCII_LOWERCASE_A: u8 = 97;
    const ASCII_LOWERCASE_F: u8 = 102;
    
    const EINVALID_HEX_CHARACTER: u64 = 1;
    const EINVALID_ADDRESS_LENGTH: u64 = 2;
} 