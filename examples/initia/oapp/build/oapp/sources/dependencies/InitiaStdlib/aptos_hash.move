/// AptosHash module exists to provide compatibility with aptos.
module initia_std::aptos_hash {
    use std::hash::{sha2_256 as s2_256, sha3_256 as s3_256};
    use initia_std::keccak::{keccak256 as k256};

    public fun sha2_256(data: vector<u8>): vector<u8> {
        s2_256(data)
    }

    public fun sha3_256(data: vector<u8>): vector<u8> {
        s3_256(data)
    }

    public fun keccak256(data: vector<u8>): vector<u8> {
        k256(data)
    }

    // TODO - add ripemd160
    // TODO - add blake2b_256
}
