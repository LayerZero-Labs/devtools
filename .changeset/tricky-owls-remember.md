---
"@layerzerolabs/devtools-evm-hardhat-test": patch
---

the test - validate-incorrect-wss-rpc is returning status 1 incorrectly on failed requests even though the output are null. patching this temporarily by doing an alternative test
