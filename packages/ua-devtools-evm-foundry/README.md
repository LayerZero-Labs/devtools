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
1. Rename `.env.example` to `.env`, then fill in the `PRIVATE_KEY`
2. In terminal, run `source .env` to load the `PRIVATE_KEY` global variable
3. Run the `forge script` command
    ```bash
    forge script --chain <chain-name> <fully qualified name of script with path> --rpc-url <rpc url> --broadcast -vvvv --sig <run function signature> <run function arguments>
    ```

For example:

```bash
forge script --chain sepolia src/ReceiveConfig.sol:ReceiveConfig --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" --broadcast -vvvv --sig "run(address, uint32, address, address, (uint64, uint8, uint8, uint8, address[], address[]))" 0xC51c580Eeb3844b4117C9B3f5e9Cc43f5B808A85 40231 0xdAf00F5eE2158dD58E0d3857851c432E34A3A851 0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7 "(100,1,0,0,[0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7],[])"
```

Transactions initiated by the above commands will be logged within a `broadcasts/` folder. For more information, see:
    
    forge script --help
