<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">Developer Cheatsheet</h1>

## Glossary

| Name               | Package             | Meaning                                                                                                                                                                                                      |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OmniPoint`        | `utils`             | Location of a contract/program in omnichain environment. Consists of an `address` and `EndpointId`                                                                                                           |
| `OmniVector`       | `utils`             | Directional connection between two `OmniPoint`s. Consists of `from` and `to` `OmniPoint`s                                                                                                                    |
| `OmniNode`         | `utils`             | Combination of an `OmniPoint` and an arbitrary configuration attached to it. Consists of a `point` and `config`                                                                                              |
| `OmniEdge`         | `utils`             | Combination of an `OmniVector` and an arbitrary configuration attached to it. Consists of a `vector` and `config`                                                                                            |
| `OmniGraph`        | `utils`             | Collection of `OmniNode`s and `OmniEdge`s that together represent a state of an omnichain application. Consists of `contracts` and `connections`                                                             |
| `OmniError`        | `utils`             | Wraps an arbitrary `error` object to add information about where that error happened. Consists of `error` and `point`                                                                                        |
| `OmniContract`     | `utils-evm`         | Wraps an `ethers` `Contract` instance to add information about the endpoint. Consists of `eid` and `contract`                                                                                                |
| `OmniPointHardhat` | `utils-evm-hardhat` | Hardhat-specific variation of `OmniPoint`. Since in hardhat we can get a contract address by its name (from `deployments`), this version of `OmniPoint` allows us to use `contractName` instead of `address` |

## Conventions

The packages are laid out according to the [principle of least knowledge](https://en.wikipedia.org/wiki/Law_of_Demeter). Their domain of action is also reflected in their name that follows the convention `[DOMAIN-]<ELEMENT>[-MODIFIER]`, for example:

- `utils` package is the most generic package and it itself does not know and cannot use any implementation details of any more specific packages, nor is it specific to any domain
- `utils-evm` package is specific to the `EVM` implementaion but it is not specific to any domain
- `ua-utils-evm` package is specific to the `EVM` implementation and specific to the `ua` (user application) domain
- `ua-utils-evm-hardhat` package is specific to the `EVM` implementation using `hardhat` and specific to the `ua` (user application) domain

The only exceptions to this rule are packages that need to follow an existing naming convention (`create-lz-oapp`) or packages for which the name needs to appeal or be intuitive/familiar to the user (`toolbox-hardhat`)

## Recipes

### `*-hardhat` packages

These packages augment the `hardhat` types and introduce a new property on the `network` configuration: `eid`. This property links the user-defined network names to LayerZero endpoint IDs:

```typescript
// hardhat.config.ts

const config: HardhatUserConfig = {
  networks: {
    "ethereum-mainnet": {
      eid: EndpointId.ETHEREUM_MAINNET,
      // ...
    },
  },
};
```

This property is required for a lot of the tooling to work - the link between network names and endpoints needs to be specified in order to wire OApps successfully.

#### Getting `hre` (`HardhatRuntimeEnvironment`) for a network

```typescript
// By network name (as specified in hardhat config)
import { getNetworkRuntimeEnvironmentByName } from "@layerzerolabs/utils-evm-hardhat";

const environment =
  await getNetworkRuntimeEnvironmentByName("avalanche-testnet");

// By endpoint ID (as specified in hardhat config, using the eid property of a network)
import { createGetNetworkRuntimeEnvironmentByEid } from "@layerzerolabs/utils-evm-hardhat";

// In this case we need to instantiate an environemnt factory
const getEnvironment = createGetNetworkRuntimeEnvironmentByEid();

const eid = EndpointId.AVALANCHE_TESTNET;
const environment = await getNetworkRuntimeEnvironmentByEid(eid);
```

#### Getting a contract instance

##### Disconnected, without a provider

```typescript
// By OmniPointHardhat
import { createContractFactory } from "@layerzerolabs/utils-evm-hardhat";

// In this case we need to instantiate a contract factory
const createContract = createContractFactory();

const eid = EndpointId.BST_MAINNET;

// We can ask for the contract by its name and eid
const contract = await createContract({ eid: address: '0x' })

// Or its name
const contract = await createContract({ eid: contractName: 'MyOApp' })
```

##### Connected, with a provider

```typescript
// By OmniPointHardhat
import { createConnectedContractFactory } from "@layerzerolabs/utils-evm-hardhat";

// In this case we need to instantiate a contract factory
const createContract = createConnectedContractFactory();

const eid = EndpointId.BST_MAINNET;

// We can ask for the contract by its name and eid
const contract = await createContract({ eid: address: '0x' })

// Or its name
const contract = await createContract({ eid: contractName: 'MyOApp' })
```
