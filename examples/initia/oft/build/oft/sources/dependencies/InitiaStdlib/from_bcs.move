/// This module provides a number of functions to convert _primitive_ types from their representation in `std::bcs`
/// to values. This is the opposite of `bcs::to_bytes`. Note that it is not safe to define a generic public `from_bytes`
/// function because this can violate implicit struct invariants, therefore only primitive types are offerred. If
/// a general conversion back-and-force is needed, consider the `initia_move::Any` type which preserves invariants.
///
/// Example:
/// ```
/// use std::bcs;
/// use initia_move::from_bcs;
///
/// assert!(from_bcs::to_address(bcs::to_bytes(&@0xabcdef)) == @0xabcdef, 0);
/// ```
module initia_std::from_bcs {
    use std::string::{Self, String};
    use std::vector;

    /// UTF8 check failed in conversion from bytes to string
    const EINVALID_UTF8: u64 = 0x1;

    public fun to_bool(v: vector<u8>): bool {
        from_bytes<bool>(v)
    }

    public fun to_u8(v: vector<u8>): u8 {
        from_bytes<u8>(v)
    }

    public fun to_u16(v: vector<u8>): u16 {
        from_bytes<u16>(v)
    }

    public fun to_u32(v: vector<u8>): u32 {
        from_bytes<u32>(v)
    }

    public fun to_u64(v: vector<u8>): u64 {
        from_bytes<u64>(v)
    }

    public fun to_u128(v: vector<u8>): u128 {
        from_bytes<u128>(v)
    }

    public fun to_u256(v: vector<u8>): u256 {
        from_bytes<u256>(v)
    }

    public fun to_address(v: vector<u8>): address {
        from_bytes<address>(v)
    }

    public fun to_bytes(v: vector<u8>): vector<u8> {
        from_bytes<vector<u8>>(v)
    }

    public fun to_vector_bytes(v: vector<u8>): vector<vector<u8>> {
        from_bytes<vector<vector<u8>>>(v)
    }

    public fun to_vector_string(v: vector<u8>): vector<String> {
        let vec_string = from_bytes<vector<String>>(v);
        vector::for_each_ref(
            &vec_string,
            |s| {
                assert!(
                    string::internal_check_utf8(string::bytes(s)),
                    EINVALID_UTF8
                );
            }
        );
        vec_string
    }

    public fun to_string(v: vector<u8>): String {
        // To make this safe, we need to evaluate the utf8 invariant.
        let s = from_bytes<String>(v);
        assert!(
            string::internal_check_utf8(string::bytes(&s)),
            EINVALID_UTF8
        );
        s
    }

    friend initia_std::any;
    friend initia_std::copyable_any;

    /// Package private native function to deserialize a type T.
    ///
    /// Note that this function does not put any constraint on `T`. If code uses this function to
    /// deserialize a linear value, its their responsibility that the data they deserialize is
    /// owned.
    public(friend) native fun from_bytes<T>(bytes: vector<u8>): T;

    #[test_only]
    use std::bcs;

    #[test]
    fun test_address() {
        let addr = @0x01;
        let addr_vec =
            x"0000000000000000000000000000000000000000000000000000000000000001";
        let addr_out = to_address(addr_vec);
        let addr_vec_out = bcs::to_bytes(&addr_out);
        assert!(addr == addr_out, 0);
        assert!(addr_vec == addr_vec_out, 1);
    }

    #[test]
    #[expected_failure(abort_code = 0x10064, location = Self)]
    fun test_address_fail() {
        let bad_vec = b"01";
        to_address(bad_vec);
    }
}
