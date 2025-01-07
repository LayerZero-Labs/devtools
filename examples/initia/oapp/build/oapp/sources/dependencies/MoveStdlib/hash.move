/// Module which defines SHA hashes for byte vectors.
///
/// The functions in this module are natively declared both in the Move runtime
/// as in the Move prover's prelude.
module std::hash {
    native public fun sha2_256(data: vector<u8>): vector<u8>;
    native public fun sha3_256(data: vector<u8>): vector<u8>;
    native public fun ripemd160(data: vector<u8>): vector<u8>;

    #[test]
    fun ripemd160_test() {
        let inputs = vector[b"testing", b""];

        // From https://www.browserling.com/tools/ripemd160-hash
        let outputs = vector[
            x"b89ba156b40bed29a5965684b7d244c49a3a769b",
            x"9c1185a5c5e9fc54612808977ee8f548b2258d31"
        ];

        let i = 0;
        while (i < std::vector::length(&inputs)) {
            let input = *std::vector::borrow(&inputs, i);
            let hash_expected = *std::vector::borrow(&outputs, i);
            let hash = ripemd160(input);

            assert!(hash_expected == hash, 1);

            i = i + 1;
        };
    }
}
