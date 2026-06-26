---
"@layerzerolabs/protocol-devtools": major
"@layerzerolabs/protocol-devtools-evm": major
"@layerzerolabs/protocol-devtools-solana": major
---

Treat explicitly-empty ULN302 config values as NIL sentinels instead of defaults

When serializing an OApp ULN302 config, an explicitly-empty field now pins the
literal zero/none via the protocol's NIL sentinel, while an omitted field still
inherits the on-chain default:

- `confirmations: 0n` now serializes to `NIL_CONFIRMATIONS` (`type(uint64).max`).
- `optionalDVNs: []` now serializes to `NIL_DVN_COUNT` (`0xff`), matching the
  existing behavior of `requiredDVNs: []`.
- Omitting a field (leaving it `undefined`) continues to inherit the on-chain
  default.

The same treatment applies to the Read library (`UlnRead`): `optionalDVNs: []`
pins `NIL_DVN_COUNT` and an empty `requiredDVNs` pins `NIL_DVN_COUNT` unless the
inherit case is forced (see below).

To support this, `Uln302UlnConfig`/`UlnReadUlnConfig` now carry `optionalDVNCount`
(and `UlnReadUlnConfig` also carries `requiredDVNCount`) so the stored sentinel
round-trips through the configuration diff. Because `requiredDVNs` is mandatory on
the user config, an empty array is ambiguous between inherit and pin-none, so both
`Uln302UlnUserConfig` and `UlnReadUlnUserConfig` gain an optional `requiredDVNCount`
override: set it to `0` to force inherit (the serializer then keeps `0` instead of
deriving the NIL sentinel from the empty array). The on-chain read path no longer
re-applies the empty→NIL mapping, keeping `hasAppUlnConfig` idempotent on both the
ULN302 and Read paths. The library-wide DEFAULT config continues to serialize
literal values (it rejects NIL sentinels on-chain). On Solana, `confirmations` is
now encoded as a `BN` so the `u64` NIL sentinel survives without precision loss.

MIGRATION:

- If you wrote `confirmations: 0` or `optionalDVNs: []` expecting the config to
  inherit the protocol default, OMIT the field instead. An explicit empty value now
  pins literal zero/none — for `confirmations` this means zero block confirmations,
  which is security-relevant. Re-wiring an existing OApp whose config used these
  empty values will now emit a `setConfig` that flips it from inherit to pinned.
- The read types `Uln302UlnConfig` (gains `optionalDVNCount`) and `UlnReadUlnConfig`
  (gains `requiredDVNCount` and `optionalDVNCount`) have new required fields. Any code
  that hand-constructs one of these (e.g. mocking an SDK read) must supply the new
  fields.
- For a Read config that inherits its required DVNs, emit `requiredDVNCount: 0`
  alongside the empty `requiredDVNs: []` (the config generator now does this), or the
  empty array will be read as pin-none and flip the config on the next wire.
