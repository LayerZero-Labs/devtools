# @layerzerolabs/hyperliquid-composer

## 1.0.4

### Patch Changes

- 52ad590: readme hyperliquid docs update
- 1b91fd2: Fix core spot command

## 1.0.3

### Patch Changes

- 97f506f: update register-spot command and add in commands to track spotMarket gas and current deployment for a token

## 1.0.2

### Patch Changes

- 90417ab: adding in freeze and quote asset during hip-1 deployment

## 1.0.1

### Patch Changes

- 166816a: chore: add virtual to \_getFinalCoreAmount in FeeToken

## 1.0.0

### Major Changes

- 62c0122: hyperliquid v1 with extensions for fee-token and recovery

## 0.0.19

### Patch Changes

- af83bac: spotClearingHouse used to print active users and core balances

## 0.0.18

### Patch Changes

- 9be22c2: change fork fuzzing to works off a forked anvil
- 253612c: fuzz run 1 on ci

## 0.0.17

### Patch Changes

- 26c44d4: hyperliquid corewriter variant
  - @layerzerolabs/oapp-evm@0.3.2

## 0.0.16

### Patch Changes

- eba8cd6: fix: native refund fallback ladder

## 0.0.15

### Patch Changes

- a2e444f: try catch forking hyperliquid mainnet and testnet rpcs

## 0.0.14

### Patch Changes

- 9578746: docs update + onlyComposer on internal -> external transformation

## 0.0.13

### Patch Changes

- 9c0c90c: using CoreWriter instead of WritePrecompile

## 0.0.12

### Patch Changes

- e633f6d: patch: skip fork tests when forking testnet fails

## 0.0.11

### Patch Changes

- 4416064: wrapper for viewing deployment state "spotDeployState" and adding in missing step to deploy the token on the spot order book

## 0.0.10

### Patch Changes

- 8ebe612: fix: select HYPE token index by chainId - 150 for mainnet and 1150 for testnet

## 0.0.9

### Patch Changes

- 3417d6b: remove oft deployer address from core spot deployment file
- d23edda: docs update - deployer trading fee

## 0.0.8

### Patch Changes

- 1900486: docs typo cleanup

## 0.0.7

### Patch Changes

- 690885c: get asset bridge address for any token and listing hip-1 token information - https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/spot#retrieve-information-about-a-token

## 0.0.6

### Patch Changes

- 000f6ec: hyperliquid sdk update - oapp-config is optional and will prompt the user for oft address and oft deploy transaction hash

## 0.0.5

### Patch Changes

- 56ec0eb: docs updated - tells devs to fund their address with $1 USDC or HYPE

## 0.0.4

### Patch Changes

- 58fe156: fix dependencies vs devdeps

## 0.0.3

### Patch Changes

- 99764f8: export cli

## 0.0.2

### Patch Changes

- 0fecf08: Force push for package release
