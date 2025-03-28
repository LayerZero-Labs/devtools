<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">LayerZero OFT Composer Library</h1>

<p align="center">
  <a href="https://docs.layerzero.network/v2/developers/evm/oft/quickstart" style="color: #a77dff">Quickstart</a> | <a href="https://docs.layerzero.network/contracts/oapp-configuration" style="color: #a77dff">Configuration</a> | <a href="https://docs.layerzero.network/contracts/options" style="color: #a77dff">Message Execution Options</a> | <a href="https://docs.layerzero.network/v2/developers/evm/composer/overview" style="color: #a77dff">Composer Overview</a>
</p>

<p align="center">
  A Composer library to integrate LayerZero composer contracts with the Omnichain Fungible Token (OFT) standard.
</p>

- [What is an Omnichain Fungible Token?](#what-is-an-omnichain-fungible-token)
- [Using Composer with OFTs](#using-composer-with-ofts)
- [LayerZero Hardhat Helper Tasks](#layerzero-hardhat-helper-tasks)
- [Developing & Deploying Contracts](#developing-contracts)
- [Connecting Contracts](#connecting-contracts)

## What is an Omnichain Fungible Token?

The Omnichain Fungible Token (OFT) standard extends the ERC20 interface to enable seamless cross-chain token transfers without the need for asset wrapping or intermediary chains. By combining LayerZero’s OApp Contract Standard with ERC20’s `_burn` and `_mint` methods, OFTs maintain a unified token supply across multiple blockchains.

<img alt="LayerZero" src="https://docs.layerzero.network/assets/images/oft_mechanism_light-922b88c364b5156e26edc6def94069f1.jpg#gh-light-mode-only"/>

Learn more about OFTs in the [OFT Quickstart](https://docs.layerzero.network/v2/developers/evm/oft/quickstart).

## Using Composer with OFTs

This repository is not only a template for OFTs, it’s a fully featured **composer library** that empowers you to build composable, cross-chain applications using LayerZero’s composer contracts in combination with the OFT standard.

For example, our repository includes an example contract (see [UniswapV3Composer.sol](./contracts/UniswapV3Composer.sol)) that demonstrates how to:

- Receive cross-chain messages via LayerZero.
- Decode composable messages (using `OFTComposeMsgCodec`) to extract parameters.
- Execute token swaps on Uniswap V3 after an OFT transfer.
- Gracefully handle failures by refunding tokens.

This composability approach lets you extend basic omnichain token transfers with additional logic—such as token swaps, lending, or other decentralized finance features. For more information on composability, visit the [What is Composability?](https://docs.layerzero.network/v2/concepts/applications/composer-standard) documentation and the [EVM Composer Overview](https://docs.layerzero.network/v2/developers/evm/composer/overview).

## LayerZero Hardhat Helper Tasks

LayerZero Devtools offers several helper tasks to deploy, configure, connect, and wire your OFT and composer contracts across multiple chains. These tasks streamline operations like:

- **Deploying Contracts:**

  ```bash
  npx hardhat lz:deploy
  ```

  Deploy your contracts to networks specified in your `hardhat.config.ts`.

- **Initializing Configuration:**

  ```bash
  npx hardhat lz:oapp:config:init --contract-name YOUR_CONTRACT_NAME --oapp-config FILE_NAME
  ```

  Generate a default `layerzero.config.ts` file for setting up cross-chain pathways.

- **Wiring Contracts:**

  ```bash
  npx hardhat lz:oapp:wire --oapp-config YOUR_LAYERZERO_CONFIG_FILE
  ```

  Connect your deployed contracts by executing the necessary configuration functions.

- **Viewing Current Configurations:**
  ```bash
  npx hardhat lz:oapp:config:get --oapp-config YOUR_OAPP_CONFIG
  ```
  Review the active, custom, and default configurations for each pathway.

For more details, refer to the [LayerZero Hardhat Helper Tasks Documentation](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying).

## Developing Contracts

### Installing dependencies

We recommend using `pnpm` (or your preferred package manager):

```bash
pnpm install
```

### Compiling your contracts

This project supports both Hardhat and Forge compilations:

```bash
pnpm compile
```

To compile with a specific tool:

```bash
pnpm compile:hardhat
pnpm compile:forge
```

### Running tests

Both Hardhat and Forge tests are supported:

```bash
pnpm test
```

Or run specific tests:

```bash
pnpm test:hardhat
pnpm test:forge
```

## Deploying Contracts

1. **Set Up Deployer Wallet:**

   - Rename `.env.example` to `.env`.
   - Configure your mnemonic or private key.

2. **Fund Your Account:**  
   Ensure your deployer wallet is funded with the appropriate native tokens.

3. **Deploy Contracts:**
   ```bash
   npx hardhat lz:deploy
   ```
   Use the `--help` flag for additional CLI options.

## Connecting Contracts

1. **Configure Connections:**  
   Generate and customize your `layerzero.config.ts` file:

   ```bash
   npx hardhat lz:oapp:config:init --contract-name [YOUR_CONTRACT_NAME] --oapp-config [CONFIG_NAME]
   ```

2. **Define Network Pathways:**  
   Specify contracts and their interconnections (e.g., Ethereum <--> Arbitrum) in your configuration file.

3. **Apply Configuration:**  
   Connect your deployed contracts by running:
   ```bash
   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
   ```

Join our community on [Discord](https://discord-layerzero.netlify.app/discord) or follow us on [Twitter](https://twitter.com/LayerZero_Labs) for updates.

---

By following these steps, you leverage LayerZero’s composer library to build and deploy innovative, composable cross-chain applications powered by the OFT standard.
