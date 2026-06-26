---
"@layerzerolabs/metadata-tools": minor
---

`generateConnectionsConfig` now treats a pathway with no optional DVNs as an explicit
"no optional DVNs" (pinned via the NIL sentinel) instead of a value that inherits the
on-chain default.

The emitted config still carries `optionalDVNs: []`, but under the new ULN302 sentinel
semantics that empty array now pins "no optional DVNs" on-chain rather than falling back
to the chain default. This is deliberate: the metadata config is the primary way a config
is consumed, and an empty optional-DVN set should be visible in the file rather than
silently inheriting the default.

Required DVNs are unaffected. Re-wiring an existing pathway that relied on the old inherit
behavior will emit a `setConfig` pinning no optional DVNs; the effective security is
unchanged, since optional DVNs with a threshold of 0 add no required verification.
