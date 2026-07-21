---
"@layerzerolabs/ua-devtools": patch
---

Fix library wire skip checks to use `areBytes32Equal`

`configureSendLibraries` / `configureReceiveLibraries` (and read-library equivalents)
previously compared addresses with `toLowerCase()` or strict `===`. Checksum or
padding mismatches caused already-pinned libraries to be re-proposed, which reverts
on-chain with `LZ_SameValue`. Comparisons now use `areBytes32Equal` while keeping
the existing "lock defaults" behavior when the OApp is still on the endpoint default.
