---
"@layerzerolabs/ua-devtools-evm-hardhat": patch
---

Generate ULN configs (both the ULN302 send/receive and the Read library generators) that
round-trip the new NIL-sentinel semantics: a field inheriting the on-chain default is
OMITTED (for both `requiredDVNs` and `optionalDVNs`, which now behave identically) rather
than emitted as an explicit empty value that would pin zero/none on re-apply. Pinned-none
configs continue to emit `[]`/`0n`.
