module initia_std::biguint {
    const NEGATIVE_RESULT: u64 = 100;
    const EDIVISION_BY_ZERO: u64 = 101;
    const CAST_OVERFLOW: u64 = 102;
    const INVALID_NUMERIC_TYPE: u64 = 103;

    struct BigUint has copy, drop, store {
        bytes: vector<u8>
    }

    // creation

    /// Create a new BigUint from little-endian bytes.
    public fun from_le_bytes(le_bytes: vector<u8>): BigUint {
        BigUint { bytes: le_bytes }
    }

    public fun zero(): BigUint {
        from_u64(0)
    }

    public fun one(): BigUint {
        from_u64(1)
    }

    public fun from_u64(num: u64): BigUint {
        let num_bytes = new_internal(num);
        BigUint { bytes: num_bytes }
    }

    public fun to_u64(num: BigUint): u64 {
        cast_internal<u64>(num.bytes)
    }

    public fun from_u128(num: u128): BigUint {
        let num_bytes = new_internal(num);
        BigUint { bytes: num_bytes }
    }

    public fun to_u128(num: BigUint): u128 {
        cast_internal<u128>(num.bytes)
    }

    public fun from_u256(num: u256): BigUint {
        let num_bytes = new_internal(num);
        BigUint { bytes: num_bytes }
    }

    public fun to_u256(num: BigUint): u256 {
        cast_internal<u256>(num.bytes)
    }

    public fun to_le_bytes(num: BigUint): vector<u8> {
        num.bytes
    }

    // arithmetic

    public fun add(num1: BigUint, num2: BigUint): BigUint {
        let result_bytes = add_internal(num1.bytes, num2.bytes);
        BigUint { bytes: result_bytes }
    }

    public fun add_by_u64(num1: BigUint, num2: u64): BigUint {
        let num2 = from_u64(num2);
        add(num1, num2)
    }

    public fun add_by_u128(num1: BigUint, num2: u128): BigUint {
        let num2 = from_u128(num2);
        add(num1, num2)
    }

    public fun add_by_u256(num1: BigUint, num2: u256): BigUint {
        let num2 = from_u256(num2);
        add(num1, num2)
    }

    public fun sub(num1: BigUint, num2: BigUint): BigUint {
        let result_bytes = sub_internal(num1.bytes, num2.bytes);
        BigUint { bytes: result_bytes }
    }

    public fun sub_by_u64(num1: BigUint, num2: u64): BigUint {
        let num2 = from_u64(num2);
        sub(num1, num2)
    }

    public fun sub_by_u128(num1: BigUint, num2: u128): BigUint {
        let num2 = from_u128(num2);
        sub(num1, num2)
    }

    public fun sub_by_u256(num1: BigUint, num2: u256): BigUint {
        let num2 = from_u256(num2);
        sub(num1, num2)
    }

    public fun mul(num1: BigUint, num2: BigUint): BigUint {
        let result_bytes = mul_internal(num1.bytes, num2.bytes);
        BigUint { bytes: result_bytes }
    }

    public fun mul_by_u64(num1: BigUint, num2: u64): BigUint {
        let num2 = from_u64(num2);
        mul(num1, num2)
    }

    public fun mul_by_u128(num1: BigUint, num2: u128): BigUint {
        let num2 = from_u128(num2);
        mul(num1, num2)
    }

    public fun mul_by_u256(num1: BigUint, num2: u256): BigUint {
        let num2 = from_u256(num2);
        mul(num1, num2)
    }

    public fun div(num1: BigUint, num2: BigUint): BigUint {
        let result_bytes = div_internal(num1.bytes, num2.bytes);
        BigUint { bytes: result_bytes }
    }

    public fun div_by_u64(num1: BigUint, num2: u64): BigUint {
        let num2 = from_u64(num2);
        div(num1, num2)
    }

    public fun div_by_u128(num1: BigUint, num2: u128): BigUint {
        let num2 = from_u128(num2);
        div(num1, num2)
    }

    public fun div_by_u256(num1: BigUint, num2: u256): BigUint {
        let num2 = from_u256(num2);
        div(num1, num2)
    }

    // cmp

    public fun eq(num1: BigUint, num2: BigUint): bool {
        num1.bytes == num2.bytes
    }

    public fun lt(num1: BigUint, num2: BigUint): bool {
        lt_internal(num1.bytes, num2.bytes)
    }

    public fun le(num1: BigUint, num2: BigUint): bool {
        le_internal(num1.bytes, num2.bytes)
    }

    public fun gt(num1: BigUint, num2: BigUint): bool {
        gt_internal(num1.bytes, num2.bytes)
    }

    public fun ge(num1: BigUint, num2: BigUint): bool {
        ge_internal(num1.bytes, num2.bytes)
    }

    public fun is_zero(num: BigUint): bool {
        eq(num, zero())
    }

    public fun is_one(num: BigUint): bool {
        eq(num, one())
    }

    native fun add_internal(
        num1_bytes: vector<u8>, num2_bytes: vector<u8>
    ): vector<u8>;
    native fun sub_internal(
        num1_bytes: vector<u8>, num2_bytes: vector<u8>
    ): vector<u8>;
    native fun mul_internal(
        num1_bytes: vector<u8>, num2_bytes: vector<u8>
    ): vector<u8>;
    native fun div_internal(
        num1_bytes: vector<u8>, num2_bytes: vector<u8>
    ): vector<u8>;
    native fun new_internal<T>(num: T): vector<u8>;
    native fun cast_internal<T>(num_bytes: vector<u8>): T;
    native fun lt_internal(num1_bytes: vector<u8>, num2_bytes: vector<u8>): bool;
    native fun le_internal(num1_bytes: vector<u8>, num2_bytes: vector<u8>): bool;
    native fun gt_internal(num1_bytes: vector<u8>, num2_bytes: vector<u8>): bool;
    native fun ge_internal(num1_bytes: vector<u8>, num2_bytes: vector<u8>): bool;

    #[test]
    fun test_biguint_u64() {
        let num1 = from_u64(4294967295u64 * 2u64);
        let num2 = from_u64(4294967295u64 * 2u64);
        let num3 = add(num1, num2);
        assert!(to_u64(num3) == 4294967295u64 * 4u64, 1);
        let num4 = sub(num1, num2);
        assert!(to_u64(num4) == 0, 1);
        let num5 = mul(num1, from_u64(2));
        assert!(to_u64(num5) == 4294967295u64 * 4u64, 2);
        let num6 = div(num1, from_u64(2));
        assert!(to_u64(num6) == 4294967295u64, 3);

        let num7 = add_by_u64(num1, 1);
        assert!(to_u64(num7) == 4294967295u64 * 2u64 + 1u64, 4);
        let num8 = sub_by_u64(num1, 1);
        assert!(to_u64(num8) == 4294967295u64 * 2u64 - 1u64, 5);
        let num9 = mul_by_u64(num1, 2);
        assert!(to_u64(num9) == 4294967295u64 * 4u64, 6);
        let num10 = div_by_u64(num1, 2);
        assert!(to_u64(num10) == 4294967295u64, 7);
    }

    #[test]
    fun test_biguint_u128() {
        let num1 = from_u128(18446744073709551615u128 * 2u128);
        let num2 = from_u128(18446744073709551615u128 * 2u128);
        let num3 = add(num1, num2);
        assert!(
            to_u128(num3) == 18446744073709551615u128 * 4u128,
            1
        );
        let num4 = sub(num1, num2);
        assert!(to_u128(num4) == 0, 1);
        let num5 = mul(num1, from_u128(2));
        assert!(
            to_u128(num5) == 18446744073709551615u128 * 4u128,
            2
        );
        let num6 = div(num1, from_u128(2));
        assert!(to_u128(num6) == 18446744073709551615u128, 3);

        let num7 = add_by_u128(num1, 1);
        assert!(
            to_u128(num7) == 18446744073709551615u128 * 2u128 + 1u128,
            4
        );
        let num8 = sub_by_u128(num1, 1);
        assert!(
            to_u128(num8) == 18446744073709551615u128 * 2u128 - 1u128,
            5
        );
        let num9 = mul_by_u128(num1, 2);
        assert!(
            to_u128(num9) == 18446744073709551615u128 * 4u128,
            6
        );
        let num10 = div_by_u128(num1, 2);
        assert!(to_u128(num10) == 18446744073709551615u128, 7);
    }

    #[test]
    fun test_biguint_u256() {
        let num1 = from_u256(340282366920938463463374607431768211455u256 * 2u256);
        let num2 = from_u256(340282366920938463463374607431768211455u256 * 2u256);
        let num3 = add(num1, num2);
        assert!(
            to_u256(num3) == 340282366920938463463374607431768211455u256 * 4u256,
            1
        );
        let num4 = sub(num1, num2);
        assert!(to_u256(num4) == 0, 1);
        let num5 = mul(num1, from_u256(2));
        assert!(
            to_u256(num5) == 340282366920938463463374607431768211455u256 * 4u256,
            2
        );
        let num6 = div(num1, from_u256(2));
        assert!(to_u256(num6) == 340282366920938463463374607431768211455u256, 3);

        let num7 = add_by_u256(num1, 1);
        assert!(
            to_u256(num7)
                == 340282366920938463463374607431768211455u256 * 2u256 + 1u256,
            4
        );
        let num8 = sub_by_u256(num1, 1);
        assert!(
            to_u256(num8)
                == 340282366920938463463374607431768211455u256 * 2u256 - 1u256,
            5
        );
        let num9 = mul_by_u256(num1, 2);
        assert!(
            to_u256(num9) == 340282366920938463463374607431768211455u256 * 4u256,
            6
        );
        let num10 = div_by_u256(num1, 2);
        assert!(to_u256(num10) == 340282366920938463463374607431768211455u256, 7);
    }

    #[test]
    #[expected_failure(abort_code = 0x10064, location = Self)]
    fun test_biguint_sub_negative() {
        let num1 = from_u64(1);
        let num2 = from_u64(2);
        let _ = sub(num1, num2);
    }

    #[test]
    #[expected_failure(abort_code = 0x10066, location = Self)]
    fun test_biguint_case_overflow_u64() {
        let num1 = from_u128(18446744073709551616u128);
        let _ = cast_internal<u64>(num1.bytes);
    }

    #[test]
    #[expected_failure(abort_code = 0x10066, location = Self)]
    fun test_biguint_case_overflow_u128() {
        let num1 = from_u256(340282366920938463463374607431768211456u256);
        let _ = cast_internal<u128>(num1.bytes);
    }

    #[test]
    #[expected_failure(abort_code = 0x10066, location = Self)]
    fun test_biguint_case_overflow_u256() {
        let num1 =
            from_u256(
                115792089237316195423570985008687907853269984665640564039457584007913129639935u256
            );
        let num1 = mul(num1, from_u64(2u64));
        let _ = cast_internal<u256>(num1.bytes);
    }

    #[test]
    fun test_biguint_max_cast() {
        let num1 = from_u64(18446744073709551615u64);
        let _ = cast_internal<u64>(num1.bytes);

        let num1 = from_u128(340282366920938463463374607431768211454u128);
        let _ = cast_internal<u128>(num1.bytes);

        let num1 =
            from_u256(
                115792089237316195423570985008687907853269984665640564039457584007913129639935u256
            );
        let _ = cast_internal<u256>(num1.bytes);
    }

    #[test]
    #[expected_failure(abort_code = 0x10065, location = Self)]
    fun test_biguint_div_by_zero() {
        let num1 = from_u64(1);
        let num2 = from_u64(0);
        let _ = div(num1, num2);
    }

    #[test]
    fun test_biguint_cmp() {
        let num1 = from_u64(1);
        let num2 = from_u64(2);
        assert!(lt(num1, num2), 1);
        assert!(le(num1, num2), 2);
        assert!(gt(num2, num1), 3);
        assert!(ge(num2, num1), 4);
        assert!(eq(num1, num1), 5);
        assert!(!eq(num1, num2), 6);
    }

    #[test]
    fun test_biguint_from_le_bytes() {
        let num1 = from_u64(1123);
        let bytes = to_le_bytes(num1);
        let num2 = from_le_bytes(bytes);
        assert!(eq(num1, num2), 1);
    }
}
