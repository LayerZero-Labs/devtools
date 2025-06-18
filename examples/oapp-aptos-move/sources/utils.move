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

    /// Safely converts a vector of bytes to a UTF-8 string
    /// Returns an Option: Some(string) if valid UTF-8, None if invalid
    public fun try_bytes_to_string(bytes: vector<u8>): std::option::Option<String> {
        if (string::try_utf8(bytes) != std::option::none()) {
            std::option::some(string::utf8(bytes))
        } else {
            std::option::none()
        }
    }

    /// Converts a hex string (without 0x prefix) to a vector of bytes
    /// Example: "48656c6c6f" -> b"Hello"
    /// Automatically pads odd-length strings with a leading zero
    public fun hex_string_to_bytes(hex_str: String): vector<u8> {
        let hex_bytes = string::bytes(&hex_str);
        let len = vector::length(hex_bytes);
        
        let padded_hex = if (len % 2 == 1) {
            let padded = vector::empty<u8>();
            vector::push_back(&mut padded, 48);
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

    /// Converts a hex string to an Aptos address
    /// Supports both with and without 0x prefix
    /// The hex string should represent exactly 32 bytes (64 hex characters)
    public fun hex_string_to_address(hex_str: String): address {
        let clean_hex = strip_hex_prefix(hex_str);
        let hex_bytes = hex_string_to_bytes(clean_hex);
        
        let padded_bytes = pad_to_32_bytes(hex_bytes);
        from_bcs::to_address(padded_bytes)
    }

    /// Converts an address to a hex string with 0x prefix
    public fun address_to_hex_string(addr: address): String {
        let addr_bytes = bcs::to_bytes(&addr);
        let hex_str = bytes_to_hex_string(addr_bytes);
        let prefix = b"0x";
        let hex_bytes = string::bytes(&hex_str);
        vector::append(&mut prefix, *hex_bytes);
        string::utf8(prefix)
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

    /// Helper function to strip 0x or 0X prefix from hex string
    fun strip_hex_prefix(hex_str: String): String {
        let bytes = string::bytes(&hex_str);
        let len = vector::length(bytes);
        
        if (len >= 2) {
            let first = *vector::borrow(bytes, 0);
            let second = *vector::borrow(bytes, 1);
            
            if (first == 48 && (second == 120 || second == 88)) {
                let remaining = vector::empty<u8>();
                let i = 2;
                while (i < len) {
                    vector::push_back(&mut remaining, *vector::borrow(bytes, i));
                    i = i + 1;
                };
                return string::utf8(remaining)
            }
        };
        
        hex_str
    }

    /// Helper function to pad bytes to 32 bytes (left-padded with zeros)
    fun pad_to_32_bytes(bytes: vector<u8>): vector<u8> {
        let len = vector::length(&bytes);
        assert!(len <= 32, EINVALID_ADDRESS_LENGTH);
        
        if (len == 32) {
            return bytes
        };
        
        let result = vector::empty<u8>();
        let padding_needed = 32 - len;
        let i = 0;
        
        while (i < padding_needed) {
            vector::push_back(&mut result, 0);
            i = i + 1;
        };
        
        vector::append(&mut result, bytes);
        result
    }

    /// Helper function to convert a hex character to u8
    fun hex_char_to_u8(char: u8): u8 {
        if (char >= 48 && char <= 57) {
            char - 48
        } else if (char >= 65 && char <= 70) {
            char - 65 + 10
        } else if (char >= 97 && char <= 102) {
            char - 97 + 10
        } else {
            abort EINVALID_HEX_CHARACTER
        }
    }

    const EINVALID_LENGTH: u64 = 1;
    const EINVALID_HEX_LENGTH: u64 = 2;
    const EINVALID_HEX_CHARACTER: u64 = 3;
    const EINVALID_ADDRESS_LENGTH: u64 = 4;
} 