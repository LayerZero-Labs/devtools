---
"@layerzerolabs/omnicounter-devtools-evm": major
"@layerzerolabs/ua-devtools-evm-hardhat": major
"@layerzerolabs/ua-devtools-evm": major
"@layerzerolabs/devtools-evm": major
"@layerzerolabs/ua-devtools-evm-hardhat-v1-test": patch
"@layerzerolabs/ua-devtools-evm-hardhat-test": patch
"@layerzerolabs/protocol-devtools-evm": patch
"@layerzerolabs/devtools-cli-test": patch
"@layerzerolabs/oft-solana-example": patch
---

Decouple UA SDKs from `hardhat-deploy`

The UA (`OApp`, `Ownable`, `LzApp`, `ERC20`) SDKs now accept a `Provider` and an `ABI` instead of an ethers `Contract` instance. Any code that uses these constructors directly needs to be updated.
