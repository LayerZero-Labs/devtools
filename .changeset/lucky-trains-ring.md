---
"@layerzerolabs/oft-solana-example": patch
---

Adds a lookup table address to the quote instruction in sendOFT. While not breaking, errors can be thrown due to tx size if the OFT uses more than the standard 2 DVNs.
