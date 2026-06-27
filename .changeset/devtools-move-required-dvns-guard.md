---
"@layerzerolabs/devtools-move": patch
---

Guard against an omitted `requiredDVNs` in `buildConfig`. `requiredDVNs` is now optional on
`Uln302UlnUserConfig`, so default it to `[]` (mirroring the existing `optionalDVNs` guard) before
passing it to `returnChecksums`, which expects a defined array — otherwise a config that omits
`requiredDVNs` would throw at runtime.
