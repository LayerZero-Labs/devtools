---
"@layerzerolabs/devtools-move": patch
---

Reject an omitted `requiredDVNs` in `buildConfig` with a clear error. `requiredDVNs` is now
optional on the shared `Uln302UlnUserConfig` type, but this encoder maps an empty required set
to the NIL sentinel (pin "no required DVNs") and cannot express "inherit the on-chain default".
Defaulting an omitted value to `[]` would silently pin the least-secure shape, so it now throws
instead — callers must pass the required DVNs explicitly, or `[]` to pin "no required DVNs".
