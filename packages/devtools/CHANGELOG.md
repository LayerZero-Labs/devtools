# @layerzerolabs/devtools

## 0.4.5

### Patch Changes

- af91805: Bump to lz-definitions 3.0.59+
- 186442a: add "test:jest" script
- Updated dependencies [186442a]
  - @layerzerolabs/io-devtools@0.1.15

## 0.4.4

### Patch Changes

- ce03876: Get latest EndpointIds by bumping lz-definitions

## 0.4.3

### Patch Changes

- 1d2abff: new SDK methods, tests in devtools-ton, upgraded lz-definitions

## 0.4.2

### Patch Changes

- 1bb0524: Upgraded dependency (@layerzerolabs/lz-definitions 3.0.12->3.0.21)

## 0.4.1

### Patch Changes

- 354ff5e: Move the wiring logic into a flow
- fce2cfb: Adding optional metadata property to OmniTransaction to improve logging

## 0.4.0

### Minor Changes

- aa37daf: Update layerzerolabs packages to 3.0.12

## 0.3.29

### Patch Changes

- 4022ded: Add createDefaultApplicative utility

## 0.3.28

### Patch Changes

- 6a07bb7: Incorporate solana-oft-v2 example

## 0.3.27

### Patch Changes

- 46ed921: Move configuration execution into a flow
- 834f317: Turn configLoadFlow into createConfigLoadFLow factory
- 811a692: Turn existing flows into flow factories
- 5e76c71: Move config loading into a flow
- Updated dependencies [834f317]
- Updated dependencies [5e76c71]
  - @layerzerolabs/io-devtools@0.1.13

## 0.3.26

### Patch Changes

- 5e48ed5: Move sign and send hardhat subtask to a generic flow function

## 0.3.25

### Patch Changes

- 893ad66: Update @LayerZero-Labs dependencies to 2.3.39

## 0.3.24

### Patch Changes

- d126c52: Update monorepo dependencies and typescript version
- Updated dependencies [d126c52]
  - @layerzerolabs/io-devtools@0.1.12

## 0.3.23

### Patch Changes

- 753a9aa: Add getPoint method to OmniSigner
- f22da2e: Handle erros coming from signer factories

## 0.3.22

### Patch Changes

- 783461e: Allow AsyncRetriable to be configured at runtime

## 0.3.21

### Patch Changes

- 11aaea4: Add non-EVM bytes logic
- efe11f6: Use fromHex instead of norlaizePeer when getting peers in OApp

## 0.3.20

### Patch Changes

- 7716a76: Move common signer functionality into devtools

## 0.3.19

### Patch Changes

- 4eb19e7: Make docker compose schema optional

## 0.3.18

### Patch Changes

- 7c51be3: Added configuration for setting callerBpsCap

## 0.3.17

### Patch Changes

- 3ec2912: Fixing changeset race condition in the PR's updating them all
- 58cbd3e: Update to latest lz dependencies
- Updated dependencies [3ec2912]
  - @layerzerolabs/io-devtools@0.1.11

## 0.3.16

### Patch Changes

- 94e6bf8: Support contractName on OmniPoint

## 0.3.15

### Patch Changes

- 8b32a79: Use less strict version requirements for layerzero peer dependencies
- Updated dependencies [8b32a79]
  - @layerzerolabs/io-devtools@0.1.10

## 0.3.14

### Patch Changes

- 87e1704: Remove LZ_ENABLE_EXPERIMENTAL_RETRY feature flag

## 0.3.13

### Patch Changes

- 8935369: Add experimental support for batched sending

## 0.3.12

### Patch Changes

- f3ab6c6: Update UIntNumberSchema to handle silly cases (like invalid toString() implementation)

## 0.3.11

### Patch Changes

- 938ac3d: Improve error reporting on UIntBigIntSchema
- Updated dependencies [938ac3d]
  - @layerzerolabs/io-devtools@0.1.9

## 0.3.10

### Patch Changes

- f865318: Update @LayerZero-Labs dependencies to 2.3.3

## 0.3.9

### Patch Changes

- edc6223: Fix AsyncRetriable for non-prototype properties
- 76df496: Add feature-flagged batched transaction waits

## 0.3.8

### Patch Changes

- dbbb331: Add withEid utility

## 0.3.7

### Patch Changes

- d5c5297: Add boilerplate reducing helpers for configuration
- afa76ae: Add createConfigureMultiple helper function

## 0.3.6

### Patch Changes

- 0f853ed: Adding `AsyncRetriable` to SDKs
- 958ae04: Update name of the LZ_ENABLE_EXPERIMENTAL_RETRY feature flag

## 0.3.5

### Patch Changes

- 947a9aa: Add helper signer types
- 947a9aa: Add Configurator helper type

## 0.3.4

### Patch Changes

- e16c864: Update @LayerZero-Labs dependencies to 2.1.27
- e16c864: Update executor config schema & types after update to 2.1.27

## 0.3.3

### Patch Changes

- c09680a: Update @LayerZero-Labs dependencies to 2.1.25

## 0.3.2

### Patch Changes

- a6f2fef: Re-export useful types from toolbox-hardhat

## 0.3.1

### Patch Changes

- ea92ae1: Add ownable functionality to OApp

## 0.3.0

### Minor Changes

- a4093ab: Adapt LayerZero package updates, including OApp version 2

## 0.2.10

### Patch Changes

- ff6427c: Align the dependency ranges
- ff6427c: Update @LayerZero-Labs dependencies to 2.1.18

## 0.2.9

### Patch Changes

- 6d2e1f8: Add types for simulation

## 0.2.8

### Patch Changes

- 40c45c1: Add tapError utility to simplify async error logging
- 40c45c1: Add mapError utility
- 4292d81: Add docker compose spec generation capabilities

## 0.2.7

### Patch Changes

- 54cf16e: Silence bigint-buffer warning
- 2b9ae6a: Sign transactions for different chains in parallel
- 2b9ae6a: Add groupTransactionsByEid utility
- Updated dependencies [54cf16e]
  - @layerzerolabs/io-devtools@0.1.5

## 0.2.6

### Patch Changes

- e7ef1aa: Update @layerzero-labs dependencies to 2.1.15

## 0.2.5

### Patch Changes

- b93a018: Update @layerzero-labs dependencies to 2.1.13

## 0.2.4

### Patch Changes

- 855fa36: Update to latest layerzerolabsmonorepo dependencies

## 0.2.3

### Patch Changes

- e0f41b5: Update @layerzero-labs dependencies

## 0.2.2

### Patch Changes

- 491b5a5: Upgrade contract Dependencies to 2.1.7

## 0.2.1

### Patch Changes

- 71e355c: Update "@layerzerolabs/\*" dependencies

## 0.2.0

### Minor Changes

- 6e464f2: Specify EndpointV2 with the "V2" suffix wherever appropriate

## 0.1.4

### Patch Changes

- 8227742: Update @layerzero-labs dependencies to 2.1.4

## 0.1.3

### Patch Changes

- 5c58d69: Update @layerzerolabs dependencies to 2.1.3
- Updated dependencies [253c79e]
- Updated dependencies [5c58d69]
  - @layerzerolabs/io-devtools@0.1.2

## 0.1.2

### Patch Changes

- 40e8dba: Remove CommaSeparatedValuesSchema in favor of splitCommaSeparated; Move LogLevelSchema; Export isLogLevel
- 4258ef3: Add retry helpers
- Updated dependencies [40e8dba]
  - @layerzerolabs/io-devtools@0.1.1

## 0.1.1

### Patch Changes

- f0036c5: Use monorepo 2.1.2 released dependencies

## 0.1.0

### Minor Changes

- 120adf1: Make packages public

### Patch Changes

- Updated dependencies [120adf1]
  - @layerzerolabs/io-devtools@0.1.0

## 0.0.6

### Patch Changes

- 8789236: Move bytes utilities to devtools
- 9b4256a: Clean up schemas; Add WithLooseBigInts generic mapped type

## 0.0.5

### Patch Changes

- 0877186: Update @layerzerolabs dependencies to 2.0.25 and 2.0.26-rc1

## 0.0.4

### Patch Changes

- af8cc25: Update dependencies
- Updated dependencies [af8cc25]
  - @layerzerolabs/io-devtools@0.0.4

## 0.0.3

### Patch Changes

- 0cce862: Fixed a problem with duplicate library registration when confgiuring Endpoint

## 0.0.2

### Patch Changes

- 70646b4: Add missing dependencies
- b5991ca: Add isDeepEqual utility
- 2dac0da: Return pending (unsubmitted) transactions when signing and sending
- Updated dependencies [e0be8b7]
- Updated dependencies [70646b4]
  - @layerzerolabs/io-devtools@0.0.2

## 0.0.1

### Patch Changes

- b74afbe: Initial 0.0.1 version
- Updated dependencies [b74afbe]
  - @layerzerolabs/io-devtools@0.0.1
