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
  <a href="/WORKFLOW.md" style="color: #a77dff">Workflow Guide</a> | <a href="/DEBUGGING.md" style="color: #a77dff">Debugging</a> | <a href="/CHEATSHEET.md" style="color: #a77dff">Cheatsheet</a> | <a href="/examples" style="color: #a77dff">Examples</a>
</p>

---

## Quick Start (External Developers)

The fastest way to start building with LayerZero:

```bash
# Create a new project from a template
npx create-lz-oapp@latest

# Follow the prompts to select:
# - Example template (OFT, OApp, ONFT)
# - Package manager
# - Project name
```

Or clone an example directly:

```bash
git clone https://github.com/LayerZero-Labs/devtools.git
cd devtools/examples/oft
pnpm install
cp .env.example .env
# Edit .env with your credentials
pnpm compile
```

---

## Key Concepts

Before diving in, understand these core concepts:

### Hardhat as Task Orchestration

In this repository, Hardhat is used as a **task orchestration system**, not just a Solidity compiler. Most LayerZero operations are exposed as Hardhat tasks:

```bash
npx hardhat lz:deploy           # Deploy to ALL configured networks
npx hardhat lz:oapp:wire        # Configure ALL pathways between contracts
npx hardhat lz:oapp:config:get  # Read configuration from ALL chains
```

### The OmniGraph Configuration Model

Your `layerzero.config.ts` defines an **OmniGraph** - a graph of contracts and their connections:

```typescript
export default async function() {
    return {
        contracts: [/* which contracts on which chains */],
        connections: [/* pathways between contracts */],
    }
}
```

The config is **async** because it fetches live metadata (DVN addresses, etc.) at runtime.

### Pathway Wiring

A "pathway" is a bidirectional connection between two contracts. Wiring involves:
- `setPeer()` - Tell each contract about its counterpart
- `setConfig()` - Configure DVNs and executors
- `setEnforcedOptions()` - Set minimum gas requirements

See [WORKFLOW.md](./WORKFLOW.md) for detailed transaction breakdowns.

---

## Repository Structure

The primary folders that smart contract developers will find most useful are:

`examples/`: Contains various example projects demonstrating how to build with `OApp.sol` (Omnichain App Standard), `OFT.sol` (Omnichain Fungible Tokens), `ONFT.sol` (Omnichain Non-Fungible Tokens), and more. These examples serve as templates and learning resources.

`packages/`: Includes a collection of NPM packages, libraries, and tools that facilitate interaction with LayerZero contracts. This includes deployment scripts, CLI tools, protocol devtools, and testing utilities.

### Where to Start

| Goal | Location |
|------|----------|
| Build a cross-chain token | `examples/oft/` |
| Build custom messaging | `examples/oapp/` |
| Wrap an existing ERC20 | `examples/oft-adapter/` |
| Build cross-chain NFT | `examples/onft721/` |
| Solana integration | `examples/oft-solana/` |
| Aptos integration | `examples/oft-aptos-move/` |

### Key Packages

| Package | Purpose |
|---------|---------|
| `toolbox-hardhat` | **Main entry point** - import this in your hardhat config |
| `oft-evm` | OFT Solidity contracts |
| `oapp-evm` | OApp Solidity contracts |
| `devtools-evm-hardhat` | Deploy tasks, HRE utilities |
| `ua-devtools-evm-hardhat` | OApp/OFT wiring tasks |

---

## Getting Started (SDK Contributors)

To get started with the LayerZero Developer Tools repository:

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

---

## Documentation

| Document | Purpose |
|----------|---------|
| [WORKFLOW.md](./WORKFLOW.md) | Complete deployment workflow and transaction model |
| [DEBUGGING.md](./DEBUGGING.md) | Troubleshooting guide for common issues |
| [CHEATSHEET.md](./CHEATSHEET.md) | Quick reference for commands and types |
| [Official Docs](https://docs.layerzero.network/) | Full protocol documentation |

---

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
pnpm test:local
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

---

## Additional Resources

- **Workflow Guide**: Check out our [WORKFLOW.md](./WORKFLOW.md) for understanding the deployment process.

- **Debugging Guide**: Our [DEBUGGING.md](./DEBUGGING.md) helps troubleshoot common issues.

- **Cheatsheet**: Our [CHEATSHEET.md](./CHEATSHEET.md) provides quick commands and tips.

- **Documentation**: Visit our [official documentation](https://docs.layerzero.network/) for detailed guides and API references.

By utilizing the resources in this repository, you can focus on creating innovative omnichain solutions without worrying about the complexities of cross-chain communication.

<p align="center">
  Join our <a href="https://layerzero.network/community" style="color: #a77dff">community</a>! | Follow us on <a href="https://x.com/LayerZero_Labs" style="color: #a77dff">X (formerly Twitter)</a>
</p>
