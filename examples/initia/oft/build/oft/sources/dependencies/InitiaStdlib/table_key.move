module initia_std::table_key {
    use std::bcs;
    use std::vector;
    use std::from_bcs;

    /// return big endian bytes of `u64`
    public fun encode_u64(key: u64): vector<u8> {
        let key_bytes = bcs::to_bytes<u64>(&key);
        vector::reverse(&mut key_bytes);

        key_bytes
    }

    /// return `u64` from the big endian key bytes
    public fun decode_u64(key_bytes: vector<u8>): u64 {
        vector::reverse(&mut key_bytes);
        from_bcs::to_u64(key_bytes)
    }

    /// return big endian bytes of `u128`
    public fun encode_u128(key: u128): vector<u8> {
        let key_bytes = bcs::to_bytes<u128>(&key);
        vector::reverse(&mut key_bytes);

        key_bytes
    }

    /// return `u128` from the big endian key bytes
    public fun decode_u128(key_bytes: vector<u8>): u128 {
        vector::reverse(&mut key_bytes);
        from_bcs::to_u128(key_bytes)
    }

    /// return big endian bytes of `u256`
    public fun encode_u256(key: u256): vector<u8> {
        let key_bytes = bcs::to_bytes<u256>(&key);
        vector::reverse(&mut key_bytes);

        key_bytes
    }

    /// return `u256` from the big endian key bytes
    public fun decode_u256(key_bytes: vector<u8>): u256 {
        vector::reverse(&mut key_bytes);
        from_bcs::to_u256(key_bytes)
    }
}
