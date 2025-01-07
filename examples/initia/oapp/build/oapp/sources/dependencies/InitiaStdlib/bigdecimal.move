module initia_std::bigdecimal {
    use initia_std::error;
    use initia_std::biguint::{Self, BigUint};

    // Const values
    const DECIMAL_FRACTIONAL: u64 = 1000000000000000000;
    const FRACTIONAL_LENGTH: u64 = 18;

    // Error codes
    const NEGATIVE_RESULT: u64 = 100;
    const EDIVISION_BY_ZERO: u64 = 101;

    struct BigDecimal has copy, drop, store {
        scaled: BigUint
    }

    fun f(): BigUint {
        biguint::from_u64(DECIMAL_FRACTIONAL)
    }

    fun hf(): BigUint {
        biguint::from_u64(DECIMAL_FRACTIONAL / 2)
    }

    fun f_1(): BigUint {
        biguint::from_u64(DECIMAL_FRACTIONAL - 1)
    }

    // creation

    /// Create a BigDecimal from a u64 value by multiplying it by the fractional part.
    public fun from_u64(value: u64): BigDecimal {
        BigDecimal {
            scaled: biguint::mul(biguint::from_u64(value), f())
        }
    }

    /// Create a BigDecimal from a u128 value by multiplying it by the fractional part.
    public fun from_u128(value: u128): BigDecimal {
        BigDecimal {
            scaled: biguint::mul(biguint::from_u128(value), f())
        }
    }

    /// Create a BigDecimal from a u256 value by multiplying it by the fractional part.
    public fun from_u256(value: u256): BigDecimal {
        BigDecimal {
            scaled: biguint::mul(biguint::from_u256(value), f())
        }
    }

    /// Create a BigDecimal from a BigUint value by multiplying it by the fractional part.
    public fun new(value: BigUint): BigDecimal {
        BigDecimal {
            scaled: biguint::mul(value, f())
        }
    }

    /// Create a BigDecimal from a scaled BigUint value.
    public fun from_scaled(scaled: BigUint): BigDecimal {
        BigDecimal { scaled: scaled }
    }

    /// Get the scaled value of a BigDecimal.
    public fun get_scaled(num: BigDecimal): BigUint {
        num.scaled
    }

    /// Create a BigDecimal from a scaled BigUint le_bytes value.
    public fun from_scaled_le_bytes(le_bytes: vector<u8>): BigDecimal {
        BigDecimal { scaled: biguint::from_le_bytes(le_bytes) }
    }

    public fun get_scaled_le_bytes(num: BigDecimal): vector<u8> {
        biguint::to_le_bytes(num.scaled)
    }

    public fun from_ratio(numerator: BigUint, denominator: BigUint): BigDecimal {
        assert!(
            !biguint::is_zero(denominator),
            error::invalid_argument(EDIVISION_BY_ZERO)
        );

        let numerator = biguint::mul(numerator, f());
        BigDecimal { scaled: biguint::div(numerator, denominator) }
    }

    public fun from_ratio_u64(numerator: u64, denominator: u64): BigDecimal {
        assert!(denominator != 0, error::invalid_argument(EDIVISION_BY_ZERO));

        let numerator = biguint::from_u128(
            (numerator as u128) * (DECIMAL_FRACTIONAL as u128)
        );
        let denominator = biguint::from_u64(denominator);

        BigDecimal { scaled: biguint::div(numerator, denominator) }
    }

    public fun from_ratio_u128(numerator: u128, denominator: u128): BigDecimal {
        assert!(denominator != 0, error::invalid_argument(EDIVISION_BY_ZERO));

        let numerator = biguint::from_u256(
            (numerator as u256) * (DECIMAL_FRACTIONAL as u256)
        );
        let denominator = biguint::from_u128(denominator);

        BigDecimal { scaled: biguint::div(numerator, denominator) }
    }

    public fun from_ratio_u256(numerator: u256, denominator: u256): BigDecimal {
        assert!(denominator != 0, error::invalid_argument(EDIVISION_BY_ZERO));

        let numerator = biguint::mul(biguint::from_u256(numerator), f());
        let denominator = biguint::from_u256(denominator);

        BigDecimal { scaled: biguint::div(numerator, denominator) }
    }

    public fun rev(num: BigDecimal): BigDecimal {
        let fractional = f();
        BigDecimal {
            scaled: biguint::div(biguint::mul(fractional, fractional), num.scaled)
        }
    }

    public fun one(): BigDecimal {
        BigDecimal { scaled: f() }
    }

    public fun zero(): BigDecimal {
        BigDecimal { scaled: biguint::zero() }
    }

    // cmp

    public fun eq(num1: BigDecimal, num2: BigDecimal): bool {
        biguint::eq(num1.scaled, num2.scaled)
    }

    public fun lt(num1: BigDecimal, num2: BigDecimal): bool {
        biguint::lt(num1.scaled, num2.scaled)
    }

    public fun le(num1: BigDecimal, num2: BigDecimal): bool {
        biguint::le(num1.scaled, num2.scaled)
    }

    public fun gt(num1: BigDecimal, num2: BigDecimal): bool {
        biguint::gt(num1.scaled, num2.scaled)
    }

    public fun ge(num1: BigDecimal, num2: BigDecimal): bool {
        biguint::ge(num1.scaled, num2.scaled)
    }

    public fun is_zero(num: BigDecimal): bool {
        biguint::is_zero(num.scaled)
    }

    public fun is_one(num: BigDecimal): bool {
        biguint::eq(num.scaled, f())
    }

    // arithmetic

    public fun add(num1: BigDecimal, num2: BigDecimal): BigDecimal {
        BigDecimal { scaled: biguint::add(num1.scaled, num2.scaled) }
    }

    public fun add_by_u64(num1: BigDecimal, num2: u64): BigDecimal {
        BigDecimal {
            scaled: biguint::add(num1.scaled, from_u64(num2).scaled)
        }
    }

    public fun add_by_u128(num1: BigDecimal, num2: u128): BigDecimal {
        BigDecimal {
            scaled: biguint::add(num1.scaled, from_u128(num2).scaled)
        }
    }

    public fun add_by_u256(num1: BigDecimal, num2: u256): BigDecimal {
        BigDecimal {
            scaled: biguint::add(num1.scaled, from_u256(num2).scaled)
        }
    }

    public fun sub(num1: BigDecimal, num2: BigDecimal): BigDecimal {
        assert!(ge(num1, num2), error::invalid_argument(NEGATIVE_RESULT));
        BigDecimal { scaled: biguint::sub(num1.scaled, num2.scaled) }
    }

    public fun sub_by_u64(num1: BigDecimal, num2: u64): BigDecimal {
        let num2 = from_u64(num2);
        assert!(ge(num1, num2), error::invalid_argument(NEGATIVE_RESULT));
        BigDecimal { scaled: biguint::sub(num1.scaled, num2.scaled) }
    }

    public fun sub_by_u128(num1: BigDecimal, num2: u128): BigDecimal {
        let num2 = from_u128(num2);
        assert!(ge(num1, num2), error::invalid_argument(NEGATIVE_RESULT));
        BigDecimal { scaled: biguint::sub(num1.scaled, num2.scaled) }
    }

    public fun sub_by_u256(num1: BigDecimal, num2: u256): BigDecimal {
        let num2 = from_u256(num2);
        assert!(ge(num1, num2), error::invalid_argument(NEGATIVE_RESULT));
        BigDecimal { scaled: biguint::sub(num1.scaled, num2.scaled) }
    }

    public fun mul(num1: BigDecimal, num2: BigDecimal): BigDecimal {
        BigDecimal {
            scaled: biguint::div(biguint::mul(num1.scaled, num2.scaled), f())
        }
    }

    public fun mul_truncate(num1: BigDecimal, num2: BigDecimal): BigUint {
        truncate(mul(num1, num2))
    }

    public fun mul_ceil(num1: BigDecimal, num2: BigDecimal): BigUint {
        ceil(mul(num1, num2))
    }

    public fun mul_by_u64(num1: BigDecimal, num2: u64): BigDecimal {
        BigDecimal { scaled: biguint::mul_by_u64(num1.scaled, num2) }
    }

    public fun mul_by_u64_truncate(num1: BigDecimal, num2: u64): u64 {
        truncate_u64(mul_by_u64(num1, num2))
    }

    public fun mul_by_u64_ceil(num1: BigDecimal, num2: u64): u64 {
        ceil_u64(mul_by_u64(num1, num2))
    }

    public fun mul_by_u128(num1: BigDecimal, num2: u128): BigDecimal {
        BigDecimal { scaled: biguint::mul_by_u128(num1.scaled, num2) }
    }

    public fun mul_by_u128_truncate(num1: BigDecimal, num2: u128): u128 {
        truncate_u128(mul_by_u128(num1, num2))
    }

    public fun mul_by_u128_ceil(num1: BigDecimal, num2: u128): u128 {
        ceil_u128(mul_by_u128(num1, num2))
    }

    public fun mul_by_u256(num1: BigDecimal, num2: u256): BigDecimal {
        BigDecimal { scaled: biguint::mul_by_u256(num1.scaled, num2) }
    }

    public fun mul_by_u256_truncate(num1: BigDecimal, num2: u256): u256 {
        truncate_u256(mul_by_u256(num1, num2))
    }

    public fun mul_by_u256_ceil(num1: BigDecimal, num2: u256): u256 {
        ceil_u256(mul_by_u256(num1, num2))
    }

    public fun div(num1: BigDecimal, num2: BigDecimal): BigDecimal {
        assert!(
            !biguint::is_zero(num2.scaled),
            error::invalid_argument(EDIVISION_BY_ZERO)
        );

        BigDecimal {
            scaled: biguint::div(biguint::mul(num1.scaled, f()), num2.scaled)
        }
    }

    public fun div_by_u64(num1: BigDecimal, num2: u64): BigDecimal {
        assert!(num2 != 0, error::invalid_argument(EDIVISION_BY_ZERO));

        BigDecimal { scaled: biguint::div_by_u64(num1.scaled, num2) }
    }

    public fun div_by_u128(num1: BigDecimal, num2: u128): BigDecimal {
        assert!(num2 != 0, error::invalid_argument(EDIVISION_BY_ZERO));

        BigDecimal { scaled: biguint::div_by_u128(num1.scaled, num2) }
    }

    public fun div_by_u256(num1: BigDecimal, num2: u256): BigDecimal {
        assert!(num2 != 0, error::invalid_argument(EDIVISION_BY_ZERO));

        BigDecimal { scaled: biguint::div_by_u256(num1.scaled, num2) }
    }

    // cast

    public fun truncate(num: BigDecimal): BigUint {
        biguint::div(num.scaled, f())
    }

    public fun truncate_u64(num: BigDecimal): u64 {
        biguint::to_u64(truncate(num))
    }

    public fun truncate_u128(num: BigDecimal): u128 {
        biguint::to_u128(truncate(num))
    }

    public fun truncate_u256(num: BigDecimal): u256 {
        biguint::to_u256(truncate(num))
    }

    public fun round_up(num: BigDecimal): BigUint {
        biguint::div(biguint::add(num.scaled, hf()), f())
    }

    public fun round_up_u64(num: BigDecimal): u64 {
        biguint::to_u64(round_up(num))
    }

    public fun round_up_u128(num: BigDecimal): u128 {
        biguint::to_u128(round_up(num))
    }

    public fun round_up_u256(num: BigDecimal): u256 {
        biguint::to_u256(round_up(num))
    }

    public fun ceil(num: BigDecimal): BigUint {
        biguint::div(biguint::add(num.scaled, f_1()), f())
    }

    public fun ceil_u64(num: BigDecimal): u64 {
        biguint::to_u64(ceil(num))
    }

    public fun ceil_u128(num: BigDecimal): u128 {
        biguint::to_u128(ceil(num))
    }

    public fun ceil_u256(num: BigDecimal): u256 {
        biguint::to_u256(ceil(num))
    }

    // tests

    #[test]
    fun test_bigdecimal() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));
        let num2 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));
        assert!(eq(num1, num2), 1);

        let num3 = from_ratio(biguint::from_u64(1), biguint::from_u64(3));
        assert!(lt(num3, num1), 2);
        assert!(gt(num1, num3), 3);

        let num4 = add(num1, num3);
        assert!(
            eq(
                num4,
                from_ratio(biguint::from_u64(5), biguint::from_u64(6))
            ),
            4
        );

        let num5 = sub(num1, num2);
        assert!(is_zero(num5), 5);

        let num6 = truncate(num1);
        assert!(biguint::is_zero(num6), 6);

        let num7 = round_up(num1);
        assert!(biguint::is_one(num7), 7);

        let num8 = round_up(num3);
        assert!(biguint::is_zero(num8), 8);

        let num9 = ceil(num3);
        assert!(biguint::is_one(num9), 9);

        let num10 = add_by_u64(num1, 1);
        assert!(
            eq(
                num10,
                from_ratio(biguint::from_u64(3), biguint::from_u64(2))
            ),
            10
        );

        let num11 = sub_by_u64(num10, 1);
        assert!(
            eq(
                num11,
                from_ratio(biguint::from_u64(1), biguint::from_u64(2))
            ),
            11
        );

        let num12 = mul_by_u64(num1, 2);
        assert!(eq(num12, from_u64(1)), 12);

        let num13 = div_by_u64(num1, 2);
        assert!(
            eq(
                num13,
                from_ratio(biguint::from_u64(1), biguint::from_u64(4))
            ),
            13
        );
    }

    #[test]
    fun test_bigdecimal_u64() {
        let num1 = from_ratio_u64(1, 2);
        let num2 = from_ratio_u64(1, 2);
        assert!(eq(num1, num2), 1);

        let num3 = from_ratio_u64(1, 3);
        assert!(lt(num3, num1), 2);
        assert!(gt(num1, num3), 3);

        let num4 = add(num1, num3);
        assert!(eq(num4, from_ratio_u64(5, 6)), 4);

        let num5 = sub(num1, num2);
        assert!(is_zero(num5), 5);

        let num6 = truncate_u64(num1);
        assert!(num6 == 0, 7);

        let num7 = round_up_u64(num1);
        assert!(num7 == 1, 8);

        let num8 = round_up_u64(num3);
        assert!(num8 == 0, 9);

        let num9 = ceil_u64(num3);
        assert!(num9 == 1, 10);

        let num10 = add_by_u64(num1, 1);
        assert!(eq(num10, from_ratio_u64(3, 2)), 11);

        let num11 = sub_by_u64(num10, 1);
        assert!(eq(num11, from_ratio_u64(1, 2)), 12);

        let num12 = mul_by_u64(num1, 2);
        assert!(eq(num12, from_u64(1)), 13);

        let num13 = div_by_u64(num1, 2);
        assert!(eq(num13, from_ratio_u64(1, 4)), 14);
    }

    #[test]
    fun test_bigdecimal_u128() {
        let num1 = from_ratio_u128(1, 2);
        let num2 = from_ratio_u128(1, 2);
        assert!(eq(num1, num2), 1);

        let num3 = from_ratio_u128(1, 3);
        assert!(lt(num3, num1), 2);
        assert!(gt(num1, num3), 3);

        let num4 = add(num1, num3);
        assert!(eq(num4, from_ratio_u128(5, 6)), 4);

        let num5 = sub(num1, num2);
        assert!(is_zero(num5), 5);

        let num6 = truncate_u128(num1);
        assert!(num6 == 0, 7);

        let num7 = round_up_u128(num1);
        assert!(num7 == 1, 8);

        let num8 = round_up_u128(num3);
        assert!(num8 == 0, 9);

        let num9 = ceil_u128(num3);
        assert!(num9 == 1, 10);

        let num10 = add_by_u128(num1, 1);
        assert!(eq(num10, from_ratio_u128(3, 2)), 11);

        let num11 = sub_by_u128(num10, 1);
        assert!(eq(num11, from_ratio_u128(1, 2)), 12);

        let num12 = mul_by_u128(num1, 2);
        assert!(eq(num12, from_u128(1)), 13);

        let num13 = div_by_u128(num1, 2);
        assert!(eq(num13, from_ratio_u128(1, 4)), 14);
    }

    #[test]
    fun test_bigdecimal_u256() {
        let num1 = from_ratio_u256(1, 2);
        let num2 = from_ratio_u256(1, 2);
        assert!(eq(num1, num2), 1);

        let num3 = from_ratio_u256(1, 3);
        assert!(lt(num3, num1), 2);
        assert!(gt(num1, num3), 3);

        let num4 = add(num1, num3);
        assert!(eq(num4, from_ratio_u256(5, 6)), 4);

        let num5 = sub(num1, num2);
        assert!(is_zero(num5), 5);

        let num6 = truncate_u256(num1);
        assert!(num6 == 0, 7);

        let num7 = round_up_u256(num1);
        assert!(num7 == 1, 8);

        let num8 = round_up_u256(num3);
        assert!(num8 == 0, 9);

        let num9 = ceil_u256(num3);
        assert!(num9 == 1, 10);

        let num10 = add_by_u256(num1, 1);
        assert!(eq(num10, from_ratio_u256(3, 2)), 11);

        let num11 = sub_by_u256(num10, 1);
        assert!(eq(num11, from_ratio_u256(1, 2)), 12);

        let num12 = mul_by_u256(num1, 2);
        assert!(eq(num12, from_u256(1)), 13);

        let num13 = div_by_u256(num1, 2);
        assert!(eq(num13, from_ratio_u256(1, 4)), 14);
    }

    #[test]
    fun test_bigdecimal_sclaed_value() {
        let num1 = div_by_u64(new(biguint::from_u64(1)), 2);
        let num2 = get_scaled(num1);
        assert!(biguint::eq(num2, biguint::from_u64(500000000000000000)), 1);

        let num3 = from_scaled(num2);
        assert!(eq(num1, num3), 2);
    }

    #[test]
    fun test_bigdecimal_one_zero() {
        let num1 = one();
        let num2 = zero();
        assert!(is_one(num1), 1);
        assert!(is_zero(num2), 2);
    }

    #[test]
    fun test_bigdecimal_from_scaled_le_bytes() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(3));
        let num2 = from_scaled_le_bytes(biguint::to_le_bytes(num1.scaled));
        assert!(eq(num1, num2), 1);
    }

    #[test]
    #[expected_failure(abort_code = 0x10064, location = Self)]
    fun test_bigdecimal_sub_negative() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(3));
        let num2 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        sub(num1, num2);
    }

    #[test]
    #[expected_failure(abort_code = 0x10064, location = Self)]
    fun test_bigdecimal_sub_by_u64_negative() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        sub_by_u64(num1, 1);
    }

    #[test]
    #[expected_failure(abort_code = 0x10064, location = Self)]
    fun test_bigdecimal_sub_by_u128_negative() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        sub_by_u128(num1, 1);
    }

    #[test]
    #[expected_failure(abort_code = 0x10064, location = Self)]
    fun test_bigdecimal_sub_by_u256_negative() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        sub_by_u256(num1, 1);
    }

    #[test]
    #[expected_failure(abort_code = 0x10065, location = Self)]
    fun test_bigdecimal_div_by_zero() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));
        let num2 = zero();

        div(num1, num2);
    }

    #[test]
    #[expected_failure(abort_code = 0x10065, location = Self)]
    fun test_bigdecimal_div_by_u64_zero() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        div_by_u64(num1, 0);
    }

    #[test]
    #[expected_failure(abort_code = 0x10065, location = Self)]
    fun test_bigdecimal_div_by_u128_zero() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        div_by_u128(num1, 0);
    }

    #[test]
    #[expected_failure(abort_code = 0x10065, location = Self)]
    fun test_bigdecimal_div_by_u256_zero() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(2));

        div_by_u256(num1, 0);
    }

    #[test]
    fun test_bigdecimal_scaled_le_bytes() {
        let num1 = from_ratio(biguint::from_u64(1), biguint::from_u64(3));
        let le_bytes = get_scaled_le_bytes(num1);
        let num2 = from_scaled_le_bytes(le_bytes);
        assert!(eq(num1, num2), 1);
    }
}
