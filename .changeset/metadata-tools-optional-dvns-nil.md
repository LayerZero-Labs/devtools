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

Re-wiring a pathway that previously inherited the on-chain default will now pin its
optional-DVN set explicitly. If that default carried optional DVNs (a non-zero threshold),
pinning an empty set drops them — this is intended. The goal is that a team's verification
config is exactly what their config file says, not something that can change underneath them
when a LayerZero-controlled default is updated. An empty optional-DVN set means "no optional
DVNs"; teams that want an optional quorum should list those DVNs explicitly. Required DVNs
are unaffected by this change.
