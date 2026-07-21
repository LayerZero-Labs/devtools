---
"@layerzerolabs/ua-devtools": patch
---

Fix library wire skip checks with chain-aware address equality

`configureSendLibraries` / `configureReceiveLibraries` (and read-library equivalents)
previously compared addresses with `toLowerCase()` or strict `===`. Checksum or
padding mismatches caused already-pinned libraries to be re-proposed, which reverts
on-chain with `LZ_SameValue`. Comparisons now use
`areBytes32Equal(normalizePeer(…, localEid), …)` so EVM checksum/padding and Solana
base58 both compare correctly. Bare `areBytes32Equal` on raw library strings is not
enough — it throws on base58. Keeps the existing "lock defaults" behavior when the
OApp is still on the endpoint default.
