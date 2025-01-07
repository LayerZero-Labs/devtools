/// Contains functions for:
///
///  1. [Ed25519](https://en.wikipedia.org/wiki/EdDSA#Ed25519) digital signatures: i.e., EdDSA signatures over Edwards25519 curves with co-factor 8
///
module initia_std::ed25519 {
    //
    // Error codes
    //

    /// Wrong number of bytes were given as input when deserializing an Ed25519 public key.
    const E_WRONG_PUBKEY_SIZE: u64 = 1;

    /// Wrong number of bytes were given as input when deserializing an Ed25519 signature.
    const E_WRONG_SIGNATURE_SIZE: u64 = 2;

    /// The number of messages, public keys, and signatures do not match.
    const E_UNMATCHED_ARGS_LENGTH: u64 = 3;

    //
    // Constants
    //

    /// The size of a serialized public key, in bytes.
    const PUBLIC_KEY_SIZE: u64 = 32;

    /// The size of a serialized signature, in bytes.
    const SIGNATURE_SIZE: u64 = 64;

    /// A Ed25519 public key
    struct PublicKey has copy, drop, store {
        bytes: vector<u8>
    }

    /// A Ed25519 signature that can be verified via `verify_internal` or `batch_verify_internal`.
    struct Signature has copy, drop, store {
        bytes: vector<u8>
    }

    //
    // Functions
    //

    /// Constructs an PublicKey struct, given 32-byte representation.
    public fun public_key_from_bytes(bytes: vector<u8>): PublicKey {
        assert!(
            std::vector::length(&bytes) == PUBLIC_KEY_SIZE,
            std::error::invalid_argument(PUBLIC_KEY_SIZE)
        );
        PublicKey { bytes }
    }

    /// Constructs an Signature struct from the given 64 bytes.
    public fun signature_from_bytes(bytes: vector<u8>): Signature {
        assert!(
            std::vector::length(&bytes) == SIGNATURE_SIZE,
            std::error::invalid_argument(E_WRONG_SIGNATURE_SIZE)
        );
        Signature { bytes }
    }

    /// Serializes an PublicKey struct to bytes.
    public fun public_key_to_bytes(pk: &PublicKey): vector<u8> {
        pk.bytes
    }

    /// Serializes an Signature struct to bytes.
    public fun signature_to_bytes(sig: &Signature): vector<u8> {
        sig.bytes
    }

    /// Verifies a Ed25519 `signature` under an `public_key` on the specified `message`.
    public fun verify(
        message: vector<u8>, public_key: &PublicKey, signature: &Signature
    ): bool {
        verify_internal(message, public_key.bytes, signature.bytes)
    }

    /// Performs batch Ed25519 signature verification.
    /// Three Variants are supported in the input for convenience:
    ///  - Equal number of messages, signatures, and public keys: Standard, generic functionality.
    ///  - One message, and an equal number of signatures and public keys: Multiple digital signature
    /// (multisig) verification of a single message.
    ///  - One public key, and an equal number of messages and signatures: Verification of multiple
    /// messages, all signed with the same private key.
    ///
    /// Any other variants of input vectors result in an error.
    ///
    /// Notes:
    ///  - The "one-message, with zero signatures and zero public keys" case, is considered the empty
    /// case.
    ///  - The "one-public key, with zero messages and zero signatures" case, is considered the empty
    /// case.
    ///  - The empty case (no messages, no signatures and no public keys) returns true.
    public fun batch_verify(
        messages: vector<vector<u8>>,
        public_keys: vector<PublicKey>,
        signatures: vector<Signature>
    ): bool {
        let message_length = std::vector::length(&messages);
        let public_key_length = std::vector::length(&public_keys);
        let signature_length = std::vector::length(&signatures);

        if (message_length == 1) {
            assert!(
                public_key_length == signature_length,
                std::error::invalid_argument(E_UNMATCHED_ARGS_LENGTH)
            );
            if (public_key_length == 0) return true;
        } else if (public_key_length == 1) {
            assert!(
                message_length == signature_length,
                std::error::invalid_argument(E_UNMATCHED_ARGS_LENGTH)
            );
            if (message_length == 0) return true;
        } else {
            assert!(
                message_length == public_key_length
                    && public_key_length == signature_length,
                std::error::invalid_argument(E_UNMATCHED_ARGS_LENGTH)
            );
            if (message_length == 0) return true;
        };

        batch_verify_internal(messages, public_keys, signatures)
    }

    native fun verify_internal(
        message: vector<u8>, public_key: vector<u8>, signature: vector<u8>
    ): bool;

    native fun batch_verify_internal(
        messages: vector<vector<u8>>,
        public_keys: vector<PublicKey>,
        signatures: vector<Signature>
    ): bool;

    #[test_only]
    native public fun generate_keys(): (vector<u8>, vector<u8>);

    #[test_only]
    native public fun sign(message: vector<u8>, secrete_key: vector<u8>): vector<u8>;

    //
    // Tests
    //

    #[test]
    fun test_gen_sign_verify() {
        let (sk, vk) = generate_keys();
        let pk = public_key_from_bytes(vk);

        let msg: vector<u8> = b"test initia ed25519";
        let sig_bytes = sign(msg, sk);
        let sig = signature_from_bytes(sig_bytes);
        assert!(verify(msg, &pk, &sig), 1);
    }

    #[test]
    fun test_gen_sign_batch_verify() {
        let (sk1, vk1) = generate_keys();
        let (sk2, vk2) = generate_keys();
        let pk1 = public_key_from_bytes(vk1);
        let pk2 = public_key_from_bytes(vk2);

        let msg: vector<u8> = b"test initia ed25519";
        let sig_bytes1 = sign(msg, sk1);
        let sig_bytes2 = sign(msg, sk2);

        let sig1 = signature_from_bytes(sig_bytes1);
        let sig2 = signature_from_bytes(sig_bytes2);

        let msgs: vector<vector<u8>> = std::vector::empty();
        let pubkeys: vector<PublicKey> = std::vector::empty();
        let sigs: vector<Signature> = std::vector::empty();

        std::vector::push_back(&mut msgs, msg);
        std::vector::push_back(&mut pubkeys, pk1);
        std::vector::push_back(&mut pubkeys, pk2);
        std::vector::push_back(&mut sigs, sig1);
        std::vector::push_back(&mut sigs, sig2);

        assert!(batch_verify(msgs, pubkeys, sigs), 1);
    }
}
