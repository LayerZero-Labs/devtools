# @layerzerolabs/ua-devtools-evm-hardhat-test

## 0.7.6

### Patch Changes

- af91805: Bump to lz-definitions 3.0.59+

## 0.7.5

### Patch Changes

- ce03876: Get latest EndpointIds by bumping lz-definitions

## 0.7.4

### Patch Changes

- d1d51ef: Bump ua-devtools-evm-hardhat dependency to 6.0.6+

## 0.7.3

### Patch Changes

- 1d2abff: new SDK methods, tests in devtools-ton, upgraded lz-definitions

## 0.7.2

### Patch Changes

- 5458b9f: Updated lz-evm-sdk-v2 dependency

## 0.7.1

### Patch Changes

- 1bb0524: Upgraded dependency (@layerzerolabs/lz-definitions 3.0.12->3.0.21)

## 0.7.0

### Minor Changes

- 2fd45ca: Add Deploy and Wire for OApp Read
- e2395b5: Add OApp Read Example

## 0.6.0

### Minor Changes

- aa37daf: Update layerzerolabs packages to 3.0.12

## 0.5.0

### Minor Changes

- b4a12d3: Update hardhat runtime environment factory to match the new environment constuctor

## 0.4.1

### Patch Changes

- 893ad66: Update @LayerZero-Labs dependencies to 2.3.39

## 0.4.0

### Minor Changes

- 8b86a36: Provide embedded ABIs for Endpoint & Uln302

## 0.3.1

### Patch Changes

- d126c52: Update monorepo dependencies and typescript version

## 0.3.0

### Minor Changes

- 1f18418: Allow EndpointV2.setConfig to return more than one transaction

## 0.2.16

### Patch Changes

- 218ab72: OpenZeppelin Contracts/Contracts-Upgradeable Upgraded to 5.0.2

## 0.2.15

### Patch Changes

- 11aaea4: Add non-EVM bytes logic

## 0.2.14

### Patch Changes

- 7c51be3: Added configuration for setting callerBpsCap

## 0.2.13

### Patch Changes

- 3ec2912: Fixing changeset race condition in the PR's updating them all
- 58cbd3e: Update to latest lz dependencies

## 0.2.12

### Patch Changes

- 87ed6f5: Add --assert flag to lz:oapp:wire task

## 0.2.11

### Patch Changes

- 8b32a79: Use less strict version requirements for layerzero peer dependencies

## 0.2.10

### Patch Changes

- 8001592: Add support for dry run mode in the wire task

## 0.2.9

### Patch Changes

- f865318: Update @LayerZero-Labs dependencies to 2.3.3

## 0.2.8

### Patch Changes

- b20ba18: Add ability to use named signers

## 0.2.7

### Patch Changes

- 947a9aa: Add Configurator helper type

## 0.2.6

### Patch Changes

- ba7ce13: Add the ability to override subtasks

## 0.2.5

### Patch Changes

- 5ef3952: Add delegate configuration

## 0.2.4

### Patch Changes

- e16c864: Update @LayerZero-Labs dependencies to 2.1.27
- e16c864: Update executor config schema & types after update to 2.1.27

## 0.2.3

### Patch Changes

- c09680a: Update @LayerZero-Labs dependencies to 2.1.25

## 0.2.2

### Patch Changes

- ac40cb2: Adding lz:ownable:transfer-ownership hardhat task
- ea92ae1: Add ownable functionality to OApp

## 0.2.1

### Patch Changes

- 059d817: Add the ability to choose gnosis safe for transaction signing; add the ability to pick signer index/address

## 0.2.0

### Minor Changes

- a4093ab: Adapt LayerZero package updates, including OApp version 2

## 0.1.12

### Patch Changes

- ff6427c: Align the dependency ranges
- ff6427c: Update @LayerZero-Labs dependencies to 2.1.18

## 0.1.11

### Patch Changes

- 226a0d5: Add feature-flagged parallel configuration execution

## 0.1.10

### Patch Changes

- 54cf16e: Silence bigint-buffer warning
- 2b9ae6a: Sign transactions for different chains in parallel

## 0.1.9

### Patch Changes

- 9e78abe: Update hardhat-deploy

## 0.1.8

### Patch Changes

- e7ef1aa: Update @layerzero-labs dependencies to 2.1.15

## 0.1.7

### Patch Changes

- b93a018: Update @layerzero-labs dependencies to 2.1.13

## 0.1.6

### Patch Changes

- 855fa36: Update to latest layerzerolabsmonorepo dependencies

## 0.1.5

### Patch Changes

- 5ca75a4: Updating lz:oapp:config:init task to generate a default LayerZero config

## 0.1.4

### Patch Changes

- ed386dc: Fixing wire task to lock in default send and receive libraries

## 0.1.3

### Patch Changes

- 491b5a5: Upgrade contract Dependencies to 2.1.7

## 0.1.2

### Patch Changes

- e766c86: Adding in Default Colors to print outs

## 0.1.1

### Patch Changes

- 71e355c: Update "@layerzerolabs/\*" dependencies

## 0.1.0

### Minor Changes

- 6e464f2: Specify EndpointV2 with the "V2" suffix wherever appropriate

## 0.0.22

### Patch Changes

- b2670f8: Adding getEnforcedOptions task
- cc62747: Rename EVM Hardhat Tasks

## 0.0.21

### Patch Changes

- 8227742: Update @layerzero-labs dependencies to 2.1.4
- 12a8550: Adding optionType to enforcedOptions config

## 0.0.20

### Patch Changes

- 2007d55: Update example configs; Use dotenv in examples; Use layerzero.config without an extension as a default value for --oapp-config

## 0.0.19

### Patch Changes

- ce0c2f4: Fixing configureEnforcedOptions

## 0.0.18

### Patch Changes

- 5c58d69: Update @layerzerolabs dependencies to 2.1.3
- 253c79e: Add lz:deploy task; Add createClearDeployments utility

## 0.0.17

### Patch Changes

- f0036c5: Use monorepo 2.1.2 released dependencies
- 62dd191: Update checkWire task to printout table of connected peers

## 0.0.16

### Patch Changes

- 17c8a23: Fix problems with --networks hardhat CLI argument parser

## 0.0.15

### Patch Changes

- 26e7509: Adding in get executor config task

## 0.0.14

### Patch Changes

- 790542f: Adding optional json argument to get default config task

## 0.0.13

### Patch Changes

- 9b75fe1: Adding optional params to getDefaultConfig and getOAppConfig tasks
- 0877186: Update @layerzerolabs dependencies to 2.0.25 and 2.0.26-rc1

## 0.0.12

### Patch Changes

- 565b646: Allow project packages to specify the external artifacts and deployments in their hardhat config
- 2b36ed9: Rafactor some of the printers in io-devtools

## 0.0.11

### Patch Changes

- 72873ef: JSDoc for Endpoint & Uln302 SDKs

## 0.0.10

### Patch Changes

- 4318721: Fix an issue where transient artifacts would not be included in error parsing
- 4318721: Add signature to the output of lz:errors:list task

## 0.0.9

### Patch Changes

- 56706ff: Add a feature-flagged lz:deploy hasrhat task

## 0.0.8

### Patch Changes

- 2e73851: Feature flag the lz:oapp:config:init task

## 0.0.7

### Patch Changes

- 2e8a49e: Updated OApp config to combine setConfig transactions

## 0.0.6

### Patch Changes

- 1e375c9: Adding EVM testing abilities for hardhat and foundry

## 0.0.5

### Patch Changes

- af8cc25: Update dependencies

## 0.0.4

### Patch Changes

- 2183cfc: Add lz:errors:list task

## 0.0.3

### Patch Changes

- b206cda: Adding checkWire task
- 7bd271e: Add PriceFeed SDK
- 6483544: Update dependency versions
- 70646b4: Add missing dependencies

## 0.0.2

### Patch Changes

- b74afbe: Initial 0.0.1 version
