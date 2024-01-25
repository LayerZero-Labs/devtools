<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 50%" src="https://layerzero.network/static/logo.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">LayerZero Developer Utilities</h1>

<p align="center">
  <a href="https://github.com/LayerZero-Labs/devtools/blob/main/DEVELOPMENT.md" style="color: #a77dff">Development</a> | <a href="https://github.com/LayerZero-Labs/devtools/blob/main/CHEATSHEET.md" style="color: #a77dff">Cheatsheet</a> | <a href="https://github.com/LayerZero-Labs/devtools/tree/main/examples" style="color: #a77dff">Examples</a>
</p>

---

**Please note** that this repository is in a **beta** state and backwards-incompatible changes might be introduced in future releases. While we strive to comply to [semver](https://semver.org/), we can not guarantee to avoid breaking changes in minor releases.

---

## Introduction

This toolkit is designed to streamline the process of building, testing, and deploying omnichain applications (OApps) using LayerZero. This tool is meant to support you through the end-to-end development lifecycle of a cross-chain project.

Visit <a href="https://docs.layerzero.network/" style="color: #a77dff">our developer docs</a> to get started building omnichain applications.

## Bootstrapping an Example Cross-Chain Project

Kick-start your development with our `create-lz-oapp` CLI utility. This command-line tool facilitates the creation of a new omnichain application project, setting up the necessary environment and dependencies:

```bash
npx create-lz-oapp@latest
```

Following this, you will be guided through setting up a project template. Choose from a variety of <a href="https://github.com/LayerZero-Labs/devtools/tree/main/examples" style="color: #a77dff">examples</a> to match your project needs.

## Writing Smart Contracts

Our example project offers templates for both the <a href="https://docs.layerzero.network/contracts/oapp" style="color: #a77dff">Omnichain Application (OApp)</a> and <a href="https://docs.layerzero.network/contracts/oft" style="color: #a77dff">Omnichain Fungible Token (OFT)</a> contracts. Select the template that suits your project:

## Writing Unit Tests

Testing your contracts is crucial. We support both <a href="https://hardhat.org/" style="color: #a77dff">Hardhat</a> and <a href="https://book.getfoundry.sh/" style="color: #a77dff">Foundry</a> frameworks for writing and running unit tests for your LayerZero contracts.

Use `npx hardhat compile` or `forge build` to compile your smart contracts.

Test your contract using `npx hardhat test` or `forge test`.

## Deploying Contracts

To deploy your contracts to your desired blockchains, run the following command in your project's folder:

```bash
# TODO: Specify the exact command for deployment
```

## Configuring Contracts

After deploying your contracts across multiple chains, it's time to configure your application's <a href="https://docs.layerzero.network/contracts/configure-dvns" style="color: #a77dff">Security Stack</a> and <a href="https://docs.layerzero.network/contracts/executor-configuration" style="color: #a77dff">Executor</a>. Initialize your OApp configuration file with:

```bash
npx hardhat lz:oapp:config:init
```

## Wiring Contracts

Finally, pair your deployed contracts using:

```bash
npx hardhat lz:oapp:wire
```

By following these steps, you can focus more on creating innovative omnichain solutions and less on the complexities of cross-chain communication.

<br></br>

<p align="center">
  Join our community on <a href="https://discord-layerzero.netlify.app/discord" style="color: #a77dff">Discord</a> | Follow us on <a href="https://twitter.com/LayerZero_Labs" style="color: #a77dff">Twitter</a>
</p>
