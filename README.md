# Notes for Auditors

Thank you for your review! We look forward to integrating your feedback.

We are building a LayerZero bridge that meets the following requirements from [this doc](https://docs.google.com/document/d/1W7mVEXjt9IBfaoHcFYQJ03F_kDtk6Qj7BqfqC33rRr4/edit?tab=t.0#heading=h.kzt98j48hcuf):

1. Mvmt Labs is the sole owner of the LZ bridge contracts on L1 and L2. Only Mvmt Labs can modify the contracts or its parameters. (STRICT REQUIREMENT)  
2. Mvmt Labs can set a (total token) volume rate limit in the L1 contract that rejects transfer requests from users on L1 once the rate limit is reached. The rate limit is such that the L2MOVE pool does not get depleted. (this requires diligent human observation of remaining pool balance). (STRICT REQUIREMENT)
3. Mvmt Labs can set a (total token) volume rate limit on the L2 contract that rejects DVN's completion of transfers on L2. The rate limit on L2 is equal or higher than the rate limit on L1. The rate limit is such that the L2MOVE pool does not get depleted. (this requires diligent human observation of remaining pool balance).(NICE TO HAVE) 
4. Mvmt Labs are the owners of the locked L1MOVE pool of the L1 bridge contract (the contract to which the user deposits to on L1).(STRICT REQUIREMENT) 
5. Mvmt Labs are the owners of the locked L2MOVE pool of the L2 bridge contract (STRICT REQUIREMENT) 

Progress satisfying the above five requrements:
- We believe requirements 1, 4, and 5 are satisfied by virtue of how LayerZero bridges work. Mvmt Labs owns the contracts and token pools by default.
- Requirement 2 is the motivation for the modifications we've made on the Solidity side.
- We believe requirement 3 is trivial to implement because we can simply set the L2 volume rate limit by calling:
```
    public entry fun set_rate_limit(admin: &signer, eid: u32, limit: u64, window_seconds: u64) {
        assert_admin(address_of(admin));
        oft_impl_config::set_rate_limit(eid, limit, window_seconds);
    }
```
in `move_oft_adapter.move`

We have a specification drafted in [PMIP-15](https://github.com/movementlabsxyz/pmip-15). 

> [!NOTE]
> This specification was written with bidirectional bridging in mind. However, we are now only required to bridge MOVE from L1 to L2 for this iteration of the bridge.  

This repository is our fork of the [LayerZero Devtools repository](https://github.com/layerzero-labs/devtools).

It contains Solidity OFT Adapter -related contracts and tests, and the Move OFT Adapter and tests, in the following files of interest:

## Solidity contracts and tests:

- [`MOVEOFTAdapter.sol`](examples/oft-evm-move-adapters/contracts/MOVEOFTAdapter.sol)
- [`RateLimiter.sol`](examples/oft-evm-move-adapters/contracts/utils/RateLimiter.sol)
- [`MOVEMock.sol`](examples/oft-evm-move-adapters/contracts/mocks/MOVEMock.sol)
- [`MOVEOFTAdapter.t.sol`](examples/oft-evm-move-adapters/test/evm/foundry/MOVEOFTAdapter.t.sol)

To test:

```
git clone https://github.com/movementlabsxyz/devtoos.git
cd devtools
git submodule update --init
cd examples/oft-evm-move-adapters
pnpm i
pnpm turbo build --force
forge test
```

## Move contracts and tests:
- [`move_oft_adapter.move`](examples/oft-evm-move-adapters/sources/oft_implementation/move_oft_adapter.move)
- [`oapp_receive_using_move_oft_adapter_tests.move`](examples/oft-evm-move-adapters/tests/oapp_receive_using_move_oft_adapter_tests.move)
- [oft_using_move_oft_adapter_tests.move](https://github.com/movementlabsxyz/devtools/blob/86f0cd4098826e30625ceedbcb526f37936e45f4/examples/oft-evm-move-adapters/tests/oft_using_move_oft_adapter_tests.move)

To test: 

In `examples/oft-evm-move-adapters` run `movement move test -dev` with Movement CLI.

## Additional context

- [Repository for the front-end](https://github.com/movementlabsxyz/bridge-interface/tree/layer-zero) we are building for users to access the bridge.
- [Working document with how we are integrating LayerZero token sending on the front-end](https://docs.google.com/document/d/1oB8QZ7uUcP5K_L5u37w6GTJbXN4dBo_wCmC7mjJHtyU/edit?tab=t.0) 
- With a two-adapter solution as we are implementing, LayerZero has expressed concerns about transactions being stuck in-flight. 

As one of their engineers put it:
> "Javing more than one adapter creates the possibility that one or more of the stores could be used up and result in unfulfillable transfers being stuck in flight. The scenarios possible with a dual lock box become more complicated if you ever want to add other chains into the mix.  The thing I lack clarity on, is that it appears that 10 bn tokens were minted on the ETH side, I presume there will also be tokens minted on the Movement side? Ultimately, using an arrangement like this requires a precise understanding of all the parameters to ensure that we can avoid a “stuck in transit” issue"

One of our researchers responded with:

> "If I understand the proposal correct there is a "store" of L2MOVE that is being slowly used up by the bridge as tokens get transferred to L2. This is aligned with our idea. We would separately mint the L2MOVE and provide the amount to the store.
> Our premise was the following. We are hoping that the LZ bridge has capability to limit how much L1MOVE it would maximally accept to lock up (X % of total supply). On L2 the LZ bridge would be supplied with an equivalent amount of tokens (X % of total supply). Then any transfer request on L1 that would exceed this restriction should not be accepted by the bridge. Consequently, no transactions could get stuck in transit."

This potential "stuck in transit" issue is one of high interest and priority. 

The remainder of this README contains the default LayerZero `devtools` repo README contents:

<p align="center">
  <a href="https://layerzero.network#gh-dark-mode-only">
    <img alt="LayerZero" style="width: 50%" src="assets/logo-dark.svg#gh-dark-mode-only"/>
  </a>  
  <a href="https://layerzero.network#gh-light-mode-only">
    <img alt="LayerZero" style="width: 50%" src="assets/logo-light.svg#gh-light-mode-only"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">LayerZero Developer Utilities</h1>

<p align="center">
  <a href="/DEVELOPMENT.md" style="color: #a77dff">Development</a> | <a href="/CHEATSHEET.md" style="color: #a77dff">Cheatsheet</a> | <a href="/examples" style="color: #a77dff">Examples</a>
</p>

---

**Please note** that this repository is in a **beta** state and backwards-incompatible changes might be introduced in future releases. While we strive to comply to [semver](https://semver.org/), we can not guarantee to avoid breaking changes in minor releases.

---

## Introduction

Welcome to the **LayerZero Developer Tools Hub**. This repository houses everything related to the LayerZero Developer Experience, including application contract standards, CLI examples, packages, scripting tools, and more. It serves as a central hub for developers to build, test, deploy, and interact with LayerZero-based omnichain applications (OApps).

Visit our <a href="https://docs.layerzero.network/" style="color: #a77dff">developer docs</a> to get started building omnichain applications.

## Repository Structure
The primary folders that smart contract developers will find most useful are:

`examples/`: Contains various example projects demonstrating how to build with `OApp.sol` (Omnichain App Standard), `OFT.sol` (Omnichain Fungible Tokens), `ONFT.sol` (Omnichain Non-Fungible Tokens), and more. These examples serve as templates and learning resources.

`packages/`: Includes a collection of NPM packages, libraries, and tools that facilitate interaction with LayerZero contracts. This includes deployment scripts, CLI tools, protocol devtools, and testing utilities.

### Examples

Here is a list of example projects available in the `examples/` directory:

```
$ ls examples
mint-burn-oft-adapter  oapp                 oft                   oft-solana            omnicounter-solana    onft721-zksync
native-oft-adapter     oapp-read            oft-adapter           oft-upgradeable       onft721               uniswap-read
```

### Packages

Here is a list of packages available in the `packages/` directory:

```
$ ls packages
build-devtools            devtools-evm-hardhat      oft-evm                   protocol-devtools-solana  toolbox-hardhat
build-lz-options          devtools-solana           oft-evm-upgradeable       test-devtools             ua-devtools
create-lz-oapp            export-deployments        omnicounter-devtools      test-devtools-evm-foundry ua-devtools-evm
decode-lz-options         io-devtools               omnicounter-devtools-evm  test-devtools-evm-hardhat ua-devtools-evm-hardhat
devtools                  oapp-alt-evm              onft-evm                  test-devtools-solana      ua-devtools-solana
devtools-cli              oapp-evm                  oapp-evm-upgradeable      test-devtools-ton         verify-contract
devtools-evm              oapp-evm-upgradeable      protocol-devtools         toolbox-foundry
```

## Getting Started

To get started with the LayerZero Developer Tools, follow these steps:

1. Clone the Repository

```
git clone https://github.com/layerzerolabs/devtools.git
cd devtools
```

2. Install Dependencies

We recommend using `pnpm` as the package manager.

```
pnpm install
```

3. Build the Packages

```
pnpm build
```

This will build all the packages and examples in the repository.

Review the README for each individual `examples/` project to learn how to interact with and use each sample project. 

## Contributing

We welcome contributions from the community! If you'd like to contribute to the LayerZero Developer Tools by adding new `examples/` or `packages/`, or by improving existing ones, please follow the guidelines below.

### Contribution Guidelines

1. Creating a Changeset

We use Changesets to manage versioning and changelogs.

For new packages or updates to existing packages, create a changeset to record the changes:

```
pnpm changeset
```

Follow the prompts to describe your changes.

2. Ensure the Project Builds Successfully

Before submitting your changes, make sure that the project builds without errors:

```
pnpm build
```

3. Linting and Code Style

This repository adheres to strict linting rules to maintain code quality.

Run the linter and fix any issues:

```
pnpm lint:fix
```

For smart contracts, ensure they comply with:

- [SolidityLang Natspec](https://docs.soliditylang.org/en/latest/style-guide.html)
- [Coinbase Solidity Style Guide](https://github.com/coinbase/solidity-style-guide)

4. Writing Tests

Add or update unit tests to cover your changes.

Ensure all tests pass:

```
pnpm test
```

5. Commit Messages

Use clear and descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

Example:

```
feat: add new MintBurnOFTAdapter example
```

6. Push Changes to Your Fork

```
git push origin feat/your-feature-name
```

7. Open a Pull Request

Go to the original repository and click **"New Pull Request."**

Choose your fork and branch as the source and the main repository's main branch as the target.

Provide a clear and detailed description of your changes.

### Reporting Issues

If you encounter any issues or bugs with existing projects, please open an issue on GitHub under the **Issues** tab.
Provide as much detail as possible, including steps to reproduce the issue.

## Additional Resources

- **Development Guide**: Check out our <a href="/DEVELOPMENT.md" style="color: #a77dff">Development</a> guide for more in-depth information on contributing to the repository.

- **Cheatsheet**: Our <a href="/CHEATSHEET.md" style="color: #a77dff">Cheatsheet</a> provides quick commands and tips.

- **Documentation**: Visit our <a href="https://docs.layerzero.network/" style="color: #a77dff">official documentation</a> for detailed guides and API references.

By utilizing the resources in this repository, you can focus on creating innovative omnichain solutions without worrying about the complexities of cross-chain communication.

<p align="center">
  Join our community on <a href="https://discord-layerzero.netlify.app/discord" style="color: #a77dff">Discord</a> | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>
