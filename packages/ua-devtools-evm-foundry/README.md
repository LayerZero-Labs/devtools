<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/ua-devtools-evm-foundry</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-devtools-evm-foundry"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/ua-devtools-evm-foundry"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-devtools-evm-foundry"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/ua-devtools-evm-foundry"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-devtools-evm-foundry"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/ua-devtools-evm-foundry"/></a>
</p>

## Installation

```sh
$ npm install @layerzerolabs/ua-devtools-evm-foundry
```

## Running Forge Scripts
We have provided 2 reference scripts in the `src/` directory that programatically set send and receive configurations. 

To run the scripts, please follow these steps:

<!-- 1. Update `.env` with your private key, the rpc urls you would like to interact with, and etherscan api key if you would like to verify any deployed contracts within your scripts. For example:

    ```bash
    MNEMONIC="test test test test test test test test test test test junk"
    PRIVATE_KEY='0x12345678909876543211234567890'

    SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
    ETHEREUM_RPC_URL="https://rpc.ankr.com/eth"

    ETHERSCAN_API_KEY="123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    ``` -->
<!-- 1. Update `foundry.toml` with the rpc urls and etherscan api key defined within the `.env` file. For example:

    ```bash
    [rpc_endpoints]
    sepolia = "${SEPOLIA_RPC_URL}"
    ethereum= "${ETHEREUM_RPC_URL}"

    [etherscan]
    sepolia = { key = "${ETHERSCAN_API_KEY}" }
    ethereum= { key = "${ETHERSCAN_API_KEY}" }
    ``` -->
3. The script can now be run using the `forge script` command. 
<!-- You may need to run `source .env` first to load global variables. -->

    ```bash
    source .env && forge script --chain <chain name from foundry.toml> <fully qualified path to script> --rpc-url <rpc url> --broadcast --verify -vvvv --sig <function signature> <function arguments>
    ```
    For example:
    ```bash
    source .env && forge script --chain sepolia scripts/ReceiveConfig.s.sol:ReceiveConfig --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvv --sig "run(address, uint32)" 0xC51c580Eeb3844b4117C9B3f5e9Cc43f5B808A85 40231
    ```

Transactions initiated by the above commands will be logged within a `broadcasts/` folder. Use the `--verify` flag if you would like to verify any contracts deployed within the script. For more information, see:
    
    forge script --help
<!-- TODO update!!