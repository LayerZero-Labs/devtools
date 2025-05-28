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
git clone https://github.com/LayerZero-Labs/devtools.git
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
  Join our <a href="https://layerzero.network/community" style="color: #a77dff">community</a>! | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>
