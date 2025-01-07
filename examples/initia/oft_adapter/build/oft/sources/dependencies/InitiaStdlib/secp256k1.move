/// This module implements ECDSA signatures based on the prime-order secp256k1 ellptic curve (i.e., cofactor is 1).

module initia_std::secp256k1 {
    use std::option::Option;

    //
    // Error codes
    //

    /// An error occurred while deserializing, for example due to wrong input size.
    const E_DESERIALIZE: u64 = 1; // This code must be the same, if ever returned from the native Rust implementation.

    //
    // constants
    //

    /// The size of a secp256k1-based ECDSA public key, in bytes.
    const RAW_PUBLIC_KEY_NUM_BYTES: u64 = 64;

    /// The size of a secp256k1-based ECDSA compressed public key, in bytes.
    const COMPRESSED_PUBLIC_KEY_SIZE: u64 = 33;

    /// The size of a secp256k1-based ECDSA signature, in bytes.
    const SIGNATURE_NUM_BYTES: u64 = 64;

    /// The size of a hashed message for secp256k1-based ECDSA signing
    const MESSAGE_SIZE: u64 = 32;

    /// A 64-byte ECDSA public key.
    struct ECDSARawPublicKey has copy, drop, store {
        bytes: vector<u8>
    }

    /// A 33-byte ECDSA public key.
    struct ECDSACompressedPublicKey has copy, drop, store {
        bytes: vector<u8>
    }

    /// A 64-byte ECDSA signature.
    struct ECDSASignature has copy, drop, store {
        bytes: vector<u8>
    }

    /// Constructs an ECDSASignature struct from the given 64 bytes.
    public fun ecdsa_signature_from_bytes(bytes: vector<u8>): ECDSASignature {
        assert!(
            std::vector::length(&bytes) == SIGNATURE_NUM_BYTES,
            std::error::invalid_argument(E_DESERIALIZE)
        );
        ECDSASignature { bytes }
    }

    /// Constructs an ECDSARawPublicKey struct, given a 64-byte raw representation.
    public fun ecdsa_raw_public_key_from_64_bytes(bytes: vector<u8>): ECDSARawPublicKey {
        ecdsa_raw_public_key_from_bytes(bytes)
    }

    /// Constructs an ECDSARawPublicKey struct, given a 64-byte raw representation.
    public fun ecdsa_raw_public_key_from_bytes(bytes: vector<u8>): ECDSARawPublicKey {
        assert!(
            std::vector::length(&bytes) == RAW_PUBLIC_KEY_NUM_BYTES,
            std::error::invalid_argument(E_DESERIALIZE)
        );
        ECDSARawPublicKey { bytes }
    }

    /// Constructs an ECDSACompressedPublicKey struct, given a 33-byte raw representation.
    public fun ecdsa_compressed_public_key_from_bytes(bytes: vector<u8>):
        ECDSACompressedPublicKey {
        assert!(
            std::vector::length(&bytes) == COMPRESSED_PUBLIC_KEY_SIZE,
            std::error::invalid_argument(E_DESERIALIZE)
        );
        ECDSACompressedPublicKey { bytes }
    }

    /// Serializes an ECDSARawPublicKey struct to 64-bytes.
    public fun ecdsa_raw_public_key_to_bytes(pk: &ECDSARawPublicKey): vector<u8> {
        pk.bytes
    }

    /// Serializes an ECDSARawPublicKey struct to 64-bytes.
    public fun ecdsa_compressed_public_key_to_bytes(
        pk: &ECDSACompressedPublicKey
    ): vector<u8> {
        pk.bytes
    }

    /// Serializes an ECDSASignature struct to 64-bytes.
    public fun ecdsa_signature_to_bytes(sig: &ECDSASignature): vector<u8> {
        sig.bytes
    }

    /// Returns `true` if the signature can verify the public key on the message
    public fun verify(
        message: vector<u8>,
        public_key: &ECDSACompressedPublicKey,
        signature: &ECDSASignature
    ): bool {
        assert!(
            std::vector::length(&message) == MESSAGE_SIZE,
            std::error::invalid_argument(E_DESERIALIZE)
        );

        return verify_internal(message, public_key.bytes, signature.bytes)
    }

    /// Recovers the signer's raw (64-byte) public key from a secp256k1 ECDSA `signature` given the `recovery_id` and the signed
    /// `message` (32 byte digest).
    ///
    /// Note that an invalid signature, or a signature from a different message, will result in the recovery of an
    /// incorrect public key. This recovery algorithm can only be used to check validity of a signature if the signer's
    /// public key (or its hash) is known beforehand.
    public fun ecdsa_recover(
        message: vector<u8>, recovery_id: u8, signature: &ECDSASignature
    ): Option<ECDSARawPublicKey> {
        assert!(
            std::vector::length(&message) == MESSAGE_SIZE,
            std::error::invalid_argument(E_DESERIALIZE)
        );

        let (pk, success) =
            recover_public_key_internal(recovery_id, message, signature.bytes, false);
        if (success) {
            std::option::some(ecdsa_raw_public_key_from_bytes(pk))
        } else {
            std::option::none<ECDSARawPublicKey>()
        }
    }

    /// Recovers the signer's raw (64-byte) public key from a secp256k1 ECDSA `signature` given the `recovery_id` and the signed
    /// `message` (32 byte digest).
    ///
    /// Note that an invalid signature, or a signature from a different message, will result in the recovery of an
    /// incorrect public key. This recovery algorithm can only be used to check validity of a signature if the signer's
    /// public key (or its hash) is known beforehand.
    public fun ecdsa_recover_compressed(
        message: vector<u8>, recovery_id: u8, signature: &ECDSASignature
    ): Option<ECDSACompressedPublicKey> {
        assert!(
            std::vector::length(&message) == MESSAGE_SIZE,
            std::error::invalid_argument(E_DESERIALIZE)
        );

        let (pk, success) =
            recover_public_key_internal(recovery_id, message, signature.bytes, true);
        if (success) {
            std::option::some(ecdsa_compressed_public_key_from_bytes(pk))
        } else {
            std::option::none<ECDSACompressedPublicKey>()
        }
    }

    //
    // Native functions
    //

    /// Returns `true` if `signature` verifies on `public_key` and `message`
    /// and returns `false` otherwise.
    ///
    /// - `message`: A 32-byte hashed message.
    /// - `public_key`: A compressed public key in bytes.
    /// - `signature`: A 64-byte ECDSA signature.
    native fun verify_internal(
        message: vector<u8>, public_key: vector<u8>, signature: vector<u8>
    ): bool;

    /// Returns `(public_key, true)` if `signature` verifies on `message` under the recovered `public_key`
    /// and returns `([], false)` otherwise.
    native fun recover_public_key_internal(
        recovery_id: u8,
        message: vector<u8>,
        signature: vector<u8>,
        compressed: bool
    ): (vector<u8>, bool);

    #[test_only]
    /// Generates an secp256k1 ECDSA key pair.
    native public fun generate_keys(compressed: bool): (vector<u8>, vector<u8>);

    #[test_only]
    /// Generates an secp256k1 ECDSA signature for a given byte array using a given signing key.
    native public fun sign(message: vector<u8>, secrete_key: vector<u8>): (u8, vector<u8>);

    //
    // Tests
    //

    #[test]
    fun test_secp256k1_sign_verify() {
        use std::hash;

        let (sk, vk) = generate_keys(true);
        let pk = ecdsa_compressed_public_key_from_bytes(vk);

        let msg: vector<u8> = hash::sha2_256(b"test initia secp256k1");
        let (_rid, sig_bytes) = sign(msg, sk);
        let sig = ecdsa_signature_from_bytes(sig_bytes);
        assert!(verify(msg, &pk, &sig), 1);

        // Test with an incorrect message
        let wrong_msg: vector<u8> = hash::sha2_256(b"wrong message");
        assert!(!verify(wrong_msg, &pk, &sig), 2);

        // Test with an incorrect signature
        let invalid_sig_bytes = sig_bytes;
        *std::vector::borrow_mut(&mut invalid_sig_bytes, 0) = *std::vector::borrow(
            &invalid_sig_bytes, 0
        ) ^ 0x1; // Corrupt the signature
        let invalid_sig = ecdsa_signature_from_bytes(invalid_sig_bytes);
        assert!(!verify(msg, &pk, &invalid_sig), 3);
    }

    #[test]
    fun test_gen_sign_recover() {
        use std::hash;

        let (sk, vk) = generate_keys(false);
        let pk = ecdsa_raw_public_key_from_bytes(vk);

        let msg: vector<u8> = hash::sha2_256(b"test initia secp256k1");
        let (rid, sig_bytes) = sign(msg, sk);
        let sig = ecdsa_signature_from_bytes(sig_bytes);
        let recovered_pk = ecdsa_recover(msg, rid, &sig);
        assert!(std::option::is_some(&recovered_pk), 1);
        assert!(
            std::option::extract(&mut recovered_pk).bytes == pk.bytes,
            2
        );

        let wrong_msg: vector<u8> = hash::sha2_256(b"test initia");
        let recovered_pk = ecdsa_recover(wrong_msg, rid, &sig);
        assert!(std::option::is_some(&recovered_pk), 3);
        assert!(
            std::option::extract(&mut recovered_pk).bytes != pk.bytes,
            4
        );
    }

    #[test]
    fun test_gen_sign_recover_compressed() {
        use std::hash;

        let (sk, vk) = generate_keys(true);
        let pk = ecdsa_compressed_public_key_from_bytes(vk);

        let msg: vector<u8> = hash::sha2_256(b"test initia secp256k1");
        let (rid, sig_bytes) = sign(msg, sk);
        let sig = ecdsa_signature_from_bytes(sig_bytes);
        let recovered_pk = ecdsa_recover_compressed(msg, rid, &sig);
        assert!(std::option::is_some(&recovered_pk), 1);
        assert!(
            std::option::extract(&mut recovered_pk).bytes == pk.bytes,
            2
        );

        let wrong_msg: vector<u8> = hash::sha2_256(b"test initia");
        let recovered_pk = ecdsa_recover_compressed(wrong_msg, rid, &sig);
        assert!(std::option::is_some(&recovered_pk), 3);
        assert!(
            std::option::extract(&mut recovered_pk).bytes != pk.bytes,
            4
        );
    }
}
