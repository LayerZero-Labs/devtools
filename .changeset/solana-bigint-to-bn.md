---
"@layerzerolabs/devtools-solana": minor
---

Add `bigIntToBN` helper (and `Bignum` type) for converting a `bigint` to the `BN` type
the Solana program instruction builders expect, preserving full precision for `u64`
values that overflow a JS number.
