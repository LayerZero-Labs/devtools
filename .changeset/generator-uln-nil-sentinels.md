---
"@layerzerolabs/ua-devtools-evm-hardhat": patch
---

Generate ULN configs (both the ULN302 send/receive and the Read library generators) that
round-trip the new NIL-sentinel semantics: a field inheriting the on-chain default is
emitted as "inherit" (omitted, or `requiredDVNCount: 0` for the mandatory required-DVNs
field) rather than an explicit empty value that would pin zero/none on re-apply.
Pinned-none configs continue to emit `[]`/`0n`.
