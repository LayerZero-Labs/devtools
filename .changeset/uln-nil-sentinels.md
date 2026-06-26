---
"@layerzerolabs/protocol-devtools": major
"@layerzerolabs/protocol-devtools-evm": major
"@layerzerolabs/protocol-devtools-solana": major
---

Treat explicitly-empty ULN302 config values as NIL sentinels instead of defaults

When serializing an OApp ULN302 / Read config, `requiredDVNs` and `optionalDVNs` now
behave identically — omitted, explicitly-empty, and concrete each map to a distinct
on-chain meaning:

- Omitting a DVN field (leaving it `undefined`) inherits the on-chain default.
- An explicitly-empty array (`[]`) pins "no DVNs" via `NIL_DVN_COUNT` (`0xff`).
- A concrete array pins those DVNs.
- Likewise `confirmations: 0n` now serializes to `NIL_CONFIRMATIONS`
  (`type(uint64).max`), while omitting it inherits the default.

To make `requiredDVNs` express "inherit" the same way `optionalDVNs` already could, it
is now OPTIONAL on `Uln302UlnUserConfig` and `UlnReadUlnUserConfig` (previously
mandatory). This removes the need for any count override — the count is always derived
from the array, so the three serializers (EVM ULN302, EVM Read, Solana ULN302) share a
single `resolveDVNCount` helper.

The read types `Uln302UlnConfig`/`UlnReadUlnConfig` carry `optionalDVNCount` (and
`UlnReadUlnConfig` also `requiredDVNCount`) so the stored sentinel round-trips through
the configuration diff, and the on-chain read path normalizes rather than re-applying
the empty→NIL mapping, keeping `hasAppUlnConfig` idempotent on both paths. The
library-wide DEFAULT config continues to serialize literal values (it rejects NIL
sentinels on-chain). On Solana, `confirmations` is now encoded as a `BN` so the `u64`
NIL sentinel survives without precision loss.

MIGRATION:

- If you wrote `confirmations: 0`, `requiredDVNs: []`, or `optionalDVNs: []` expecting
  the config to inherit the protocol default, OMIT the field instead. An explicit empty
  value now pins literal zero/none — for `confirmations` this means zero block
  confirmations, and for `requiredDVNs` it means no required DVNs, both
  security-relevant. Re-wiring an existing OApp whose config used these empty values
  will emit a `setConfig` that flips it from inherit to pinned.
- The read types `Uln302UlnConfig` (gains `optionalDVNCount`) and `UlnReadUlnConfig`
  (gains `requiredDVNCount` and `optionalDVNCount`) have new required fields. Any code
  that hand-constructs one of these (e.g. mocking an SDK read) must supply the new
  fields.
- `requiredDVNs` is no longer required on the user config. Code that always set it
  keeps working unchanged; you may now omit it to inherit the on-chain default.
