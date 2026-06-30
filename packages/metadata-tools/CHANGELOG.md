# @layerzerolabs/metadata-tools

## 4.0.0

### Minor Changes

- 6afd57b: `generateConnectionsConfig` now treats a pathway with no optional DVNs as an explicit
  "no optional DVNs" (pinned via the NIL sentinel) instead of a value that inherits the
  on-chain default.

  The emitted config still carries `optionalDVNs: []`, but under the new ULN302 sentinel
  semantics that empty array now pins "no optional DVNs" on-chain rather than falling back
  to the chain default. This is deliberate: the metadata config is the primary way a config
  is consumed, and an empty optional-DVN set should be visible in the file rather than
  silently inheriting the default.

  Re-wiring a pathway that previously inherited the on-chain default will now pin its
  optional-DVN set explicitly. If that default carried optional DVNs (a non-zero threshold),
  pinning an empty set drops them — this is intended. The goal is that a team's verification
  config is exactly what their config file says, not something that can change underneath them
  when a LayerZero-controlled default is updated. An empty optional-DVN set means "no optional
  DVNs"; teams that want an optional quorum should list those DVNs explicitly. Required DVNs
  are unaffected by this change.

### Patch Changes

- @layerzerolabs/ua-devtools@6.0.0

## 3.0.3

### Patch Changes

- 01b911a: metadata-tools: support skipping of eids

## 3.0.2

### Patch Changes

- db3a1d4: add block msg lib support on evm and optional dvns support on evm and solana
- db3a1d4: Updates simple config to support blocked messageLib on Solana and EVM
- Updated dependencies [db3a1d4]
- Updated dependencies [db3a1d4]
  - @layerzerolabs/ua-devtools@5.0.1

## 3.0.1

### Patch Changes

- 6f63e37: Enables appending custom Executors to returned metadata

## 3.0.0

### Patch Changes

- Updated dependencies [0aff8fb]
  - @layerzerolabs/ua-devtools@5.0.0
  - @layerzerolabs/devtools-evm-hardhat@4.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [f228dfe]
  - @layerzerolabs/devtools-evm-hardhat@3.1.0

## 1.0.0

### Patch Changes

- @layerzerolabs/devtools-evm-hardhat@3.0.0
- @layerzerolabs/ua-devtools@4.0.0

## 0.4.1

### Patch Changes

- 630ca77: fix generateConnectionsConfig when called with no params
- Updated dependencies [13bdae7]
  - @layerzerolabs/devtools-evm-hardhat@2.0.9

## 0.4.0

### Minor Changes

- 6e233e3: allow for custom fetchMetadata implementation

## 0.3.2

### Patch Changes

- e256387: Updating packages
- Updated dependencies [e256387]
  - @layerzerolabs/devtools-evm-hardhat@2.0.7
  - @layerzerolabs/ua-devtools@3.0.5

## 0.3.1

### Patch Changes

- 186442a: add "test:jest" script
- Updated dependencies [af91805]
- Updated dependencies [186442a]
  - @layerzerolabs/devtools-evm-hardhat@2.0.6
  - @layerzerolabs/ua-devtools@3.0.4

## 0.3.0

### Minor Changes

- dd9bf25: Filter out deprecated DVN addresses

## 0.2.0

### Minor Changes

- fa73cc4: only use dvn version 2 in metadata-tools

## 0.1.0

### Minor Changes

- e455d72: add solana support to metadata-tools

## 0.0.2

### Patch Changes

- d255778: add metadata-tools package
- Updated dependencies [1d2abff]
  - @layerzerolabs/devtools-evm-hardhat@2.0.4
  - @layerzerolabs/ua-devtools@3.0.2
