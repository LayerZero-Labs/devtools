# @layerzerolabs/oft-solana-example

## 0.11.0

### Minor Changes

- f228dfe: refactor(solana): internalize account checker and priority fee getter

## 0.10.0

### Minor Changes

- bb62f09: Moved logging info to io-devtools package

## 0.9.0

### Minor Changes

- 1596719: fix(solana examples): fix bug where evm contract object is treated as solana
- 27cdcb4: feat(solana examples): support freeze authority param for createOFT script

### Patch Changes

- eb6d163: refactor logger helpers; export `DebugLogger` from `io-devtools`; update example imports

## 0.8.0

### Minor Changes

- f5980f4: Normalized the send task so that EVM and Solana share identical send logic, along with logging

## 0.7.15

### Patch Changes

- 74ac06c: Adds a lookup table address to the quote instruction in sendOFT. While not breaking, errors can be thrown due to tx size if the OFT uses more than the standard 2 DVNs.

## 0.7.14

### Patch Changes

- eba3669: Rename clear script to retry-payload

## 0.7.13

### Patch Changes

- 4ff1db8: feat(oft-solana): remove need for manual solana endpoint ID input
- 28eb8be: feat(oft-solana): support loading keypair via path
- 0385135: fix import in setInboundRateLimit

## 0.7.12

### Patch Changes

- 292803d: introduce fix suggestions, starting with when Solana init-config is skipped

## 0.7.11

### Patch Changes

- 8817095: Add the ability to filter out connections from specified EndpointIds

## 0.7.10

### Patch Changes

- 8b6c422: Bump monorepo dependencies to latest patch version

## 0.7.9

### Patch Changes

- a843edf: Debugging Hardhat tasks

## 0.7.8

### Patch Changes

- ce3a36b: introduce getSolanaDeploymentFunction and simplify solana task params

## 0.7.7

### Patch Changes

- e4f8538: feat(oft-solana): remove need to pass in solana secret key flag

## 0.7.6

### Patch Changes

- e256387: Updating packages

## 0.7.5

### Patch Changes

- fe71c0e: fix typo and mention how to transfer ownership

## 0.7.4

### Patch Changes

- 6bbe466: move solana init to own script and update task name

## 0.7.3

### Patch Changes

- e5fffc3: fix import in createOFT.ts
- fcf924d: docs: default to using solana 1.18

## 0.7.2

### Patch Changes

- 274b8aa: Add task to get Solana rate limits

## 0.7.1

### Patch Changes

- 213a76b: Enable optimizer explicitly

## 0.7.0

### Minor Changes

- 57a80a8: added script to update metaplex metadata

## 0.6.0

### Minor Changes

- 1ce802a: oft-solana - throw if trying to send more than owned

## 0.5.1

### Patch Changes

- 12eaa61: oft-solana(getSimulationComputeUnits): increase backoff max delay from 3s to 10s

## 0.5.0

### Minor Changes

- 4af9800: fallback for getSimulationComputeUnits

## 0.4.9

### Patch Changes

- a2ecefd: fix missing return statement when user chooses no to 'continue with onlyOftStore'

## 0.4.8

### Patch Changes

- af91805: Bump to lz-definitions 3.0.59+

## 0.4.7

### Patch Changes

- ce03876: Get latest EndpointIds by bumping lz-definitions

## 0.4.6

### Patch Changes

- d1d51ef: Bump ua-devtools-evm-hardhat dependency to 6.0.6+

## 0.4.5

### Patch Changes

- 1d2abff: new SDK methods, tests in devtools-ton, upgraded lz-definitions

## 0.4.4

### Patch Changes

- 1bb0524: Upgraded dependency (@layerzerolabs/lz-definitions 3.0.12->3.0.21)

## 0.4.3

### Patch Changes

- 447af65: Use concurrently for parallel compilation task

## 0.4.2

### Patch Changes

- 59cd485: Fix add additional minters to createOFT

## 0.4.1

### Patch Changes

- 63238e9: Add ability to swap out the mint authority with a new SPL multisig

## 0.4.0

### Minor Changes

- e2395b5: Add OApp Read Example

## 0.3.1

### Patch Changes

- 2540bb1: solana support for lz:oapp:config:get

## 0.3.0

### Minor Changes

- aa37daf: Update layerzerolabs packages to 3.0.12

## 0.2.1

### Patch Changes

- ff5972b: Fix createOFT should allow 0 amount

## 0.2.0

### Minor Changes

- ccba37b: Bump for solana oftv2

### Patch Changes

- 019cd52: Bump for new Solana Implementation Version
- 4ca5233: Enable squadsv4 CLI support

## 0.1.5

### Patch Changes

- f34f4fe: Add support for Token2022 and housecleaning
- 33ff07d: Fix refund address for EVM send script
- e59f693: Resolves Issue 926, allowing createOFT to have amount=0

## 0.1.4

### Patch Changes

- 6a07bb7: New solana OFT reference
