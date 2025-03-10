# @layerzerolabs/devtools-evm-hardhat

## 2.0.8

### Patch Changes

- 24311f8: Minor bug fixes
- 8b6c422: Bump monorepo dependencies to latest patch version
- Updated dependencies [24311f8]
- Updated dependencies [8b6c422]
  - @layerzerolabs/devtools-evm@1.0.6
  - @layerzerolabs/devtools@0.4.8

## 2.0.7

### Patch Changes

- e256387: Updating packages
- Updated dependencies [e256387]
  - @layerzerolabs/devtools@0.4.6
  - @layerzerolabs/devtools-evm@1.0.5
  - @layerzerolabs/export-deployments@0.0.16
  - @layerzerolabs/io-devtools@0.1.16

## 2.0.6

### Patch Changes

- af91805: Bump to lz-definitions 3.0.59+
- 186442a: add "test:jest" script
- Updated dependencies [af91805]
- Updated dependencies [186442a]
  - @layerzerolabs/devtools-evm@1.0.4
  - @layerzerolabs/devtools@0.4.5
  - @layerzerolabs/export-deployments@0.0.15
  - @layerzerolabs/io-devtools@0.1.15

## 2.0.5

### Patch Changes

- ce03876: Get latest EndpointIds by bumping lz-definitions
- Updated dependencies [ce03876]
  - @layerzerolabs/devtools-evm@1.0.3
  - @layerzerolabs/devtools@0.4.4

## 2.0.4

### Patch Changes

- 1d2abff: new SDK methods, tests in devtools-ton, upgraded lz-definitions
- Updated dependencies [1d2abff]
  - @layerzerolabs/devtools-evm@1.0.2
  - @layerzerolabs/devtools@0.4.3

## 2.0.3

### Patch Changes

- 1bb0524: Upgraded dependency (@layerzerolabs/lz-definitions 3.0.12->3.0.21)
- Updated dependencies [1bb0524]
  - @layerzerolabs/devtools-evm@1.0.1
  - @layerzerolabs/devtools@0.4.2

## 2.0.2

### Patch Changes

- 5b563f0: Added optional stage and networks arguments to lz:healthcheck:validate:rpcs task
- 31b0610: Fix typo in CLI

## 2.0.1

### Patch Changes

- 30e01b8: Updating devtools dependency

## 2.0.0

### Minor Changes

- aa37daf: Update layerzerolabs packages to 3.0.12

### Patch Changes

- Updated dependencies [aa37daf]
  - @layerzerolabs/devtools-evm@1.0.0
  - @layerzerolabs/devtools@0.4.0

## 1.2.3

### Patch Changes

- 35b7cfa: Fix an issue with outdated hardhat deploy cache
- Updated dependencies [4d94521]
  - @layerzerolabs/export-deployments@0.0.12

## 1.2.2

### Patch Changes

- 811a692: Turn existing flows into flow factories
- 5e76c71: Move config loading into a flow
- Updated dependencies [46ed921]
- Updated dependencies [834f317]
- Updated dependencies [811a692]
- Updated dependencies [5e76c71]
  - @layerzerolabs/devtools@0.3.27
  - @layerzerolabs/io-devtools@0.1.13

## 1.2.1

### Patch Changes

- 5e48ed5: Move sign and send hardhat subtask to a generic flow function
- Updated dependencies [5e48ed5]
  - @layerzerolabs/devtools@0.3.26

## 1.2.0

### Minor Changes

- b4a12d3: Update hardhat runtime environment factory to match the new environment constuctor

## 1.1.2

### Patch Changes

- fd3ea33: Renamed lz:validate-safe-configs and lz:validate-rpcs to lz:healthcheck:validate:safe-configs and lz:healthcheck:validate:rpcs, respectively
- 7ad6485: Task to validate RPC URLs within hardhat.config.ts

## 1.1.1

### Patch Changes

- 3208a32: Task to validate safe configurations within hardhat.config.ts
- 893ad66: Update @LayerZero-Labs dependencies to 2.3.39
- Updated dependencies [893ad66]
  - @layerzerolabs/devtools-evm@0.4.2
  - @layerzerolabs/devtools@0.3.25

## 1.1.0

### Minor Changes

- 8b86a36: Provide embedded ABIs for Endpoint & Uln302

## 1.0.2

### Patch Changes

- 3b6cbe4: Add eid hardhat CLI parser

## 1.0.1

### Patch Changes

- d126c52: Update monorepo dependencies and typescript version
- Updated dependencies [d126c52]
  - @layerzerolabs/export-deployments@0.0.11
  - @layerzerolabs/devtools-evm@0.4.1
  - @layerzerolabs/io-devtools@0.1.12
  - @layerzerolabs/devtools@0.3.24

## 1.0.0

### Minor Changes

- 1f18418: Allow EndpointV2.setConfig to return more than one transaction

### Patch Changes

- Updated dependencies [1f18418]
  - @layerzerolabs/devtools-evm@0.4.0

## 0.3.26

### Patch Changes

- 4eb19e7: Make docker compose schema optional
- Updated dependencies [4eb19e7]
  - @layerzerolabs/devtools@0.3.19

## 0.3.25

### Patch Changes

- 1818fbd: Don't force network to be defined when formatting transactions

## 0.3.24

### Patch Changes

- 73270f3: Add createDefaultContext utility for creating hardhat context outside of hardhat CLI
- a831501: Add better errors for missing deployments

## 0.3.23

### Patch Changes

- e26636b: Allow specifying filesystem paths for external artifacts

## 0.3.22

### Patch Changes

- 0783460: Allow users to specify whether the simulation accounts should be overriden

## 0.3.21

### Patch Changes

- 3ec2912: Fixing changeset race condition in the PR's updating them all
- 58cbd3e: Update to latest lz dependencies
- Updated dependencies [3ec2912]
- Updated dependencies [58cbd3e]
  - @layerzerolabs/devtools@0.3.17
  - @layerzerolabs/devtools-evm@0.3.13
  - @layerzerolabs/export-deployments@0.0.10
  - @layerzerolabs/io-devtools@0.1.11

## 0.3.20

### Patch Changes

- cd963d1: Don't overwrite hardhat network accounts for the simulation

## 0.3.19

### Patch Changes

- 2746ede: Add --follow flag to simulation logs task

## 0.3.18

### Patch Changes

- 94e6bf8: Support contractName on OmniPoint
- Updated dependencies [94e6bf8]
  - @layerzerolabs/devtools@0.3.16

## 0.3.17

### Patch Changes

- 8b32a79: Use less strict version requirements for layerzero peer dependencies
- Updated dependencies [8b32a79]
  - @layerzerolabs/devtools-evm@0.3.10
  - @layerzerolabs/devtools@0.3.15
  - @layerzerolabs/export-deployments@0.0.9
  - @layerzerolabs/io-devtools@0.1.10

## 0.3.16

### Patch Changes

- aef7c85: Only load all deployments if a deployment could not be found

## 0.3.15

### Patch Changes

- 1e9b652: Exit with error code when simulation fails to start
- Updated dependencies [f3ab6c6]
  - @layerzerolabs/devtools@0.3.12

## 0.3.14

### Patch Changes

- 71d6101: Fix a display issue with deployment progressbar
- c190bf5: Add --stage CLI argument to the simulation task

## 0.3.13

### Patch Changes

- 938ac3d: Improve error reporting on UIntBigIntSchema
- Updated dependencies [938ac3d]
  - @layerzerolabs/io-devtools@0.1.9
  - @layerzerolabs/devtools@0.3.11
  - @layerzerolabs/devtools-evm@0.3.8
  - @layerzerolabs/export-deployments@0.0.8

## 0.3.12

### Patch Changes

- f865318: Update @LayerZero-Labs dependencies to 2.3.3
- Updated dependencies [f865318]
  - @layerzerolabs/export-deployments@0.0.7
  - @layerzerolabs/devtools-evm@0.3.7
  - @layerzerolabs/devtools@0.3.10

## 0.3.11

### Patch Changes

- 835cdbe: Replace Mumbai with Amoy

## 0.3.10

### Patch Changes

- c41c6be: Fix problems with missing deployments

## 0.3.9

### Patch Changes

- b20ba18: Add ability to use named signers
- Updated dependencies [b20ba18]
  - @layerzerolabs/devtools-evm@0.3.6

## 0.3.8

### Patch Changes

- 1047bcb: Add the ability to inherit task definitions

## 0.3.7

### Patch Changes

- cc080a9: Support local LayerZero environments

## 0.3.6

### Patch Changes

- 0f853ed: Adding `AsyncRetriable` to SDKs
- Updated dependencies [0f853ed]
- Updated dependencies [958ae04]
  - @layerzerolabs/devtools@0.3.6
  - @layerzerolabs/devtools-evm@0.3.5

## 0.3.5

### Patch Changes

- 7f2ebc6: Add --stage CLI argument to lz:deploy task

## 0.3.4

### Patch Changes

- 947a9aa: Add InferOmniGraph helper type
- 947a9aa: Add Configurator helper type
- Updated dependencies [947a9aa]
- Updated dependencies [947a9aa]
  - @layerzerolabs/devtools@0.3.5
  - @layerzerolabs/devtools-evm@0.3.4

## 0.3.3

### Patch Changes

- e16c864: Update @LayerZero-Labs dependencies to 2.1.27
- e16c864: Update executor config schema & types after update to 2.1.27
- Updated dependencies [e16c864]
- Updated dependencies [e16c864]
  - @layerzerolabs/export-deployments@0.0.6
  - @layerzerolabs/devtools-evm@0.3.3
  - @layerzerolabs/devtools@0.3.4

## 0.3.2

### Patch Changes

- c09680a: Update @LayerZero-Labs dependencies to 2.1.25
- Updated dependencies [c09680a]
  - @layerzerolabs/export-deployments@0.0.5
  - @layerzerolabs/devtools-evm@0.3.2
  - @layerzerolabs/devtools@0.3.3

## 0.3.1

### Patch Changes

- 059d817: Add the ability to choose gnosis safe for transaction signing; add the ability to pick signer index/address
- Updated dependencies [059d817]
  - @layerzerolabs/devtools-evm@0.3.1

## 0.3.0

### Minor Changes

- a4093ab: Adapt LayerZero package updates, including OApp version 2

### Patch Changes

- Updated dependencies [a4093ab]
  - @layerzerolabs/devtools-evm@0.3.0
  - @layerzerolabs/devtools@0.3.0

## 0.2.15

### Patch Changes

- 28b2598: Add simulation tasks under LZ_ENABLE_EXPERIMENTAL_SIMULATION feature flag

## 0.2.14

### Patch Changes

- eb4e4d0: Adjust simulation config logic for anvil
- ff6427c: Align the dependency ranges
- ff6427c: Update @LayerZero-Labs dependencies to 2.1.18
- Updated dependencies [f9987d3]
- Updated dependencies [ff6427c]
- Updated dependencies [ff6427c]
  - @layerzerolabs/devtools-evm@0.2.12
  - @layerzerolabs/devtools@0.2.10

## 0.2.13

### Patch Changes

- 622fd00: Add docker compose utilities for simulation

## 0.2.12

### Patch Changes

- 711cb98: Add config utilities for simulation
- 6d2e1f8: Add types for simulation
- Updated dependencies [6d2e1f8]
  - @layerzerolabs/devtools-evm@0.2.10
  - @layerzerolabs/devtools@0.2.9

## 0.2.11

### Patch Changes

- 54cf16e: Silence bigint-buffer warning
- Updated dependencies [54cf16e]
- Updated dependencies [2b9ae6a]
- Updated dependencies [2b9ae6a]
  - @layerzerolabs/devtools@0.2.7
  - @layerzerolabs/devtools-evm@0.2.8
  - @layerzerolabs/export-deployments@0.0.4
  - @layerzerolabs/io-devtools@0.1.5

## 0.2.10

### Patch Changes

- 9e78abe: Update hardhat-deploy
- Updated dependencies [9e78abe]
  - @layerzerolabs/io-devtools@0.1.4

## 0.2.9

### Patch Changes

- d0d1cb3: Mark hardhat tasks with exit code 1 if they were not successful

## 0.2.8

### Patch Changes

- e7ef1aa: Update @layerzero-labs dependencies to 2.1.15
- Updated dependencies [e7ef1aa]
  - @layerzerolabs/devtools-evm@0.2.7
  - @layerzerolabs/devtools@0.2.6

## 0.2.7

### Patch Changes

- b93a018: Update @layerzero-labs dependencies to 2.1.13
- Updated dependencies [b93a018]
  - @layerzerolabs/devtools-evm@0.2.6
  - @layerzerolabs/devtools@0.2.5

## 0.2.6

### Patch Changes

- 855fa36: Update to latest layerzerolabsmonorepo dependencies
- Updated dependencies [855fa36]
  - @layerzerolabs/export-deployments@0.0.3
  - @layerzerolabs/devtools-evm@0.2.5
  - @layerzerolabs/devtools@0.2.4

## 0.2.5

### Patch Changes

- 2732dfc: Add support for submitting transactions to Gnosis Safes using @safe-global
- Updated dependencies [2732dfc]
  - @layerzerolabs/devtools-evm@0.2.4

## 0.2.4

### Patch Changes

- f0392c5: Add export deployments hardhat task

## 0.2.3

### Patch Changes

- e0f41b5: Update @layerzero-labs dependencies
- Updated dependencies [e0f41b5]
  - @layerzerolabs/devtools-evm@0.2.3
  - @layerzerolabs/devtools@0.2.3

## 0.2.2

### Patch Changes

- 491b5a5: Upgrade contract Dependencies to 2.1.7
- Updated dependencies [491b5a5]
  - @layerzerolabs/devtools-evm@0.2.2
  - @layerzerolabs/devtools@0.2.2

## 0.2.1

### Patch Changes

- 71e355c: Update "@layerzerolabs/\*" dependencies
- Updated dependencies [71e355c]
  - @layerzerolabs/devtools-evm@0.2.1
  - @layerzerolabs/devtools@0.2.1

## 0.2.0

### Minor Changes

- 6e464f2: Specify EndpointV2 with the "V2" suffix wherever appropriate

### Patch Changes

- Updated dependencies [6e464f2]
  - @layerzerolabs/devtools-evm@0.2.0
  - @layerzerolabs/devtools@0.2.0

## 0.1.6

### Patch Changes

- 700168d: Move sign & send logic into a subtask

## 0.1.5

### Patch Changes

- 5675416: Fix problems with missing deployments when running lz:deploy

## 0.1.4

### Patch Changes

- 8227742: Update @layerzero-labs dependencies to 2.1.4
- 3a438b1: Compile project before depolying in lz:deploy
- Updated dependencies [8227742]
  - @layerzerolabs/devtools-evm@0.1.3
  - @layerzerolabs/devtools@0.1.4

## 0.1.3

### Patch Changes

- 5c58d69: Update @layerzerolabs dependencies to 2.1.3
- 253c79e: Add lz:deploy task; Add createClearDeployments utility
- Updated dependencies [253c79e]
- Updated dependencies [5c58d69]
  - @layerzerolabs/io-devtools@0.1.2
  - @layerzerolabs/devtools-evm@0.1.2
  - @layerzerolabs/devtools@0.1.3

## 0.1.2

### Patch Changes

- 40e8dba: Remove CommaSeparatedValuesSchema in favor of splitCommaSeparated; Move LogLevelSchema; Export isLogLevel
- Updated dependencies [40e8dba]
- Updated dependencies [4258ef3]
  - @layerzerolabs/io-devtools@0.1.1
  - @layerzerolabs/devtools@0.1.2

## 0.1.1

### Patch Changes

- f0036c5: Use monorepo 2.1.2 released dependencies
- Updated dependencies [f0036c5]
  - @layerzerolabs/devtools@0.1.1
  - @layerzerolabs/devtools-evm@0.1.1

## 0.1.0

### Minor Changes

- 120adf1: Make packages public

### Patch Changes

- Updated dependencies [120adf1]
  - @layerzerolabs/devtools-evm@0.1.0
  - @layerzerolabs/io-devtools@0.1.0
  - @layerzerolabs/devtools@0.1.0

## 0.0.11

### Patch Changes

- 17c8a23: Fix problems with --networks hardhat CLI argument parser

## 0.0.10

### Patch Changes

- 0877186: Update @layerzerolabs dependencies to 2.0.25 and 2.0.26-rc1
- Updated dependencies [0877186]
  - @layerzerolabs/devtools-evm@0.0.6
  - @layerzerolabs/devtools@0.0.5

## 0.0.9

### Patch Changes

- e5a9f35: Add hardhat CLI argument parsers for networks and for general CSV values

## 0.0.8

### Patch Changes

- 565b646: Allow project packages to specify the external artifacts and deployments in their hardhat config
- Updated dependencies [2b36ed9]
- Updated dependencies [2b36ed9]
  - @layerzerolabs/io-devtools@0.0.6

## 0.0.7

### Patch Changes

- 4318721: Fix an issue where transient artifacts would not be included in error parsing
- 4318721: Add signature to the output of lz:errors:list task
- Updated dependencies [8931fb2]
  - @layerzerolabs/devtools-evm@0.0.5

## 0.0.6

### Patch Changes

- 56706ff: Add a feature-flagged lz:deploy hasrhat task

## 0.0.5

### Patch Changes

- 1e375c9: Adding EVM testing abilities for hardhat and foundry

## 0.0.4

### Patch Changes

- af8cc25: Update dependencies
- Updated dependencies [af8cc25]
  - @layerzerolabs/devtools-evm@0.0.4
  - @layerzerolabs/io-devtools@0.0.4
  - @layerzerolabs/devtools@0.0.4

## 0.0.3

### Patch Changes

- 2183cfc: Add lz:errors:list task
- 2183cfc: Add getAllArtifacts helper
- fe1542e: Add getEidsByNetworkName utility
- Updated dependencies [5077bf1]
- Updated dependencies [5077bf1]
  - @layerzerolabs/io-devtools@0.0.3
  - @layerzerolabs/devtools-evm@0.0.3

## 0.0.2

### Patch Changes

- 5236166: Add a generic contract error parser for hardhat projects
- 6483544: Update dependency versions
- 70646b4: Add missing dependencies
- 8ac903c: Fix type extension imports for toolbox-hardhat
- Updated dependencies [e0be8b7]
- Updated dependencies [70646b4]
- Updated dependencies [b5991ca]
- Updated dependencies [2dac0da]
  - @layerzerolabs/io-devtools@0.0.2
  - @layerzerolabs/devtools-evm@0.0.2
  - @layerzerolabs/devtools@0.0.2

## 0.0.1

### Patch Changes

- b74afbe: Initial 0.0.1 version
- Updated dependencies [b74afbe]
  - @layerzerolabs/devtools-evm@0.0.1
  - @layerzerolabs/io-devtools@0.0.1

## 0.0.2

### Patch Changes

- 6964deb: Memoize create\* calls
