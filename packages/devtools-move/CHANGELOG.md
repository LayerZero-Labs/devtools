# @layerzerolabs/devtools-move

## 2.0.0

### Major Changes

- 128b697: update initia.js version and object creation seed derivation

### Patch Changes

- 6afd57b: Reject an omitted `requiredDVNs` in `buildConfig` with a clear error. `requiredDVNs` is now
  optional on the shared `Uln302UlnUserConfig` type, but this encoder maps an empty required set
  to the NIL sentinel (pin "no required DVNs") and cannot express "inherit the on-chain default".
  Defaulting an omitted value to `[]` would silently pin the least-secure shape, so it now throws
  instead — callers must pass the required DVNs explicitly, or `[]` to pin "no required DVNs".

## 1.0.18

### Patch Changes

- f447c85: fix e2e test

## 1.0.17

### Patch Changes

- a2851bf: bump versions of monorepo packages

## 1.0.16

### Patch Changes

- c5966ba: Allow zero hex addresses in `basexToBytes32` util and update docs

## 1.0.15

### Patch Changes

- 06dc63b: quality of life improvements

## 1.0.14

### Patch Changes

- 84d469f: update packages for non-evm support

## 1.0.13

### Patch Changes

- f27462a: baseX converter does not depend on chainType

## 1.0.12

### Patch Changes

- db3a1d4: Updates simple config to support blocked messageLib on Solana and EVM

## 1.0.11

### Patch Changes

- a532d9e: Fix export of bigint

## 1.0.10

### Patch Changes

- 6a5d25e: fix move CLI version checks

## 1.0.9

### Patch Changes

- 8747ede: use 0.7.2 as a supported version

## 1.0.8

### Patch Changes

- 139bf08: fix to allow move OFTs to be wired to a Solana peer

## 1.0.7

### Patch Changes

- b1feef7: Devex improvements.

## 1.0.6

### Patch Changes

- ab97af8: Normalizing address comparison in setter scripts.

## 1.0.5

### Patch Changes

- cd6de9d: Tx export functinality for Initia, improving README.md instructions for clarity, 2 minor bug fixes.

## 1.0.4

### Patch Changes

- 3ab7ce7: fixing incorrect args for building compose option
- ff0b018: adding initia mainnet addresses

## 1.0.3

### Patch Changes

- ed9aed9: Percolate --skip-connections-from-eids by upgrading toolbox-hardhat across the project

## 1.0.2

### Patch Changes

- adding support for initia chain and cleanup

## 1.0.1

### Patch Changes

- c31fec8: exporting typescript packages

## 1.0.0

### Major Changes

- 24311f8: Minor bug fixes

### Patch Changes

- 8b6c422: Bump monorepo dependencies to latest patch version

## 0.0.3

### Patch Changes

- e256387: Updating packages

## 0.0.2

### Patch Changes

- 8cc2d40: Explicitly publish move packages
