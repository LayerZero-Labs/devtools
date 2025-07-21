---
"@layerzerolabs/oft-evm": minor
---

Implements custom overflow checking to prevent silent truncation of funds when shared decimals is changed and reduces the decimalConversionRate. OpenZeppelin's SafeCast toUint64() is not used in this implementation.
