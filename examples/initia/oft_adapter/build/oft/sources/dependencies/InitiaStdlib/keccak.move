/// Cryptographic hashes:
/// - Keccak-256: see https://keccak.team/keccak.html
///
/// In addition, SHA2-256 and SHA3-256 are available in `std::hash`. Note that SHA3-256 is a variant of Keccak: it is
/// NOT the same as Keccak-256.
module initia_std::keccak {
    /// Returns the Keccak-256 hash of `bytes`.
    native public fun keccak256(byte: vector<u8>): vector<u8>;
    //
    // Testing
    //

    #[test]
    fun keccak256_test() {
        let inputs = vector[b"testing", b""];

        let outputs = vector[
            x"5f16f4c7f149ac4f9510d9cf8cf384038ad348b3bcdc01915f95de12df9d1b02",
            x"c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        ];

        let i = 0;
        while (i < std::vector::length(&inputs)) {
            let input = *std::vector::borrow(&inputs, i);
            let hash_expected = *std::vector::borrow(&outputs, i);
            let hash = keccak256(input);

            assert!(hash_expected == hash, 1);

            i = i + 1;
        };
    }
}
