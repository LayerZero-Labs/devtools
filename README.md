# ua-utils

A set of common tasks for contracts integrating LayerZero

## Installation

```sh
$ npm install @layerzerolabs/ua-utils
```
The plugin depends on [`@nomiclabs/hardhat-ethers`](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers), so you need to import both plugins in your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ethers");
require("@layerzerolabs/ua-utils");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@nomiclabs/hardhat-ethers";
import "@layerzerolabs/ua-utils";
```

Make sure that network names in your `hardhat.config.js` match the following [naming convention](https://github.com/LayerZero-Labs/sdk/blob/main/packages/lz-sdk/src/enums/ChainKey.ts).
## Tasks

The package adds the following tasks:

 - `getDefaultConfig` returns the default configuration for the specified chains.

    Usage:

    ```sh
    npx hardhat getDefaultConfig --networks ethereum,bsc,polygon,avalanche
    ```
 - `getConfig` returns the configuration of the specified contract.

    Parameters:
    - `address` - the contract address. An optional parameter. Either contract name or contract address must be specified.
    - `name` - the contract name. An optional parameter. It must be specified only if the contract was deployed using [`hardhat-deploy`](https://www.npmjs.com/package/hardhat-deploy) and the deployments information is located in the deployments folder.
    - `network` - the network the contract is deployed to.
    - `remote-networks` - a comma separated list of remote networks the contract is configured with.

    Usage:	

    ```sh
    npx hardhat getConfig --network ethereum --remote-networks bsc,polygon,avalanche --name OFT
    ```
 - `setConfig` sets the configuration of the specified contract.
   
    Parameters:
    - `config-path` - the relative path to a file containing the configuration.
    - `address` - the address of the deployed contracts. An optional parameter. It should be provided if the contract address is the same on all chains. For contracts with different addresses, specify the address for each chain in the config. 
    - `name` - the name of the deployed contracts. An optional parameter. It should be provided only if the same contract deployed on all chains using [`hardhat-deploy`](https://www.npmjs.com/package/hardhat-deploy) and the deployment information is located in the deployments folder. For contracts with different names, specify the name for each chain in the config. 
    - `gnosis-config-path` - the relative path to a file containing the gnosis configuration. An optional parameter. If specified, the transactions will be sent to Gnosis.

    Usage:	

     ```sh
     npx hardhat setConfig --networks ethereum,bsc,avalanche --name OFT --config-path "./appConfig.json" --gnosis-config-path "./gnosisConfig.json"
     ```
    <br/>

    Below is an example of the application configuration
   
    ```json
    {
         "ethereum": {
             "address": "",
             "name": "ProxyOFT",
             "sendVersion": 2,
             "receiveVersion": 2,
             "remoteConfigs": [
                 {
                     "remoteChain": "bsc",
                     "inboundProofLibraryVersion": 1,
                     "inboundBlockConfirmations": 20,
                     "relayer": "0x902F09715B6303d4173037652FA7377e5b98089E",
                     "outboundProofType": 1,
                     "outboundBlockConfirmations": 15,
                     "oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
                 },
                 {
                     "remoteChain": "avalanche",
                     "inboundProofLibraryVersion": 1,
                     "inboundBlockConfirmations": 12,
                     "relayer": "0x902F09715B6303d4173037652FA7377e5b98089E",
                     "outboundProofType": 1,
                     "outboundBlockConfirmations": 15,
                     "oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
                 }
             ]
         },
         "bsc": {			
             "address": "0x0702c7B1b18E5EBf022e17182b52F0AC262A8062",
             "name": "",
             "sendVersion": 2,
             "receiveVersion": 2,
             "remoteConfigs": [
                 {
                     "remoteChain": "ethereum",
                     "inboundProofLibraryVersion": 1,
                     "inboundBlockConfirmations": 15,
                     "relayer": "0xA27A2cA24DD28Ce14Fb5f5844b59851F03DCf182",
                     "outboundProofType": 1,
                     "outboundBlockConfirmations": 20,
                     "oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
                 }
             ]
         }
    }
    ```
    The top level elements represent chains the contracts are deployed to. The configuration section for each chain has the following fields:
    - `address` - the contract address. An optional parameter. It should be provided if no address was specified in the task parameters.
    - `name` - the contract name. An optional parameter. It should be provided only if the contract was deployed using [`hardhat-deploy`](https://www.npmjs.com/package/hardhat-deploy) and the deployment information is located in the deployments folder.
    - `sendVersion` - the version of a messaging library contract used to send messages. If it isn't specified, the default version will be used.
    - `receiveVersion` - the version of a messaging library contract used to receive messages. If it isn't specified, the default version will be used.
    - `remoteConfigs` - an array of configuration settings for remote chains. 
    
    <br>

    The configuration section for each chain has the following fields:

    - `remoteChain` - the remote chain name.
    - `inboundProofLibraryVersion` - the version of proof library for inbound messages.
    - `inboundBlockConfirmations` - the number of block confirmations for inbound messages.
    - `relayer` - the address of Relayer contract.
    - `outboundProofType` - proof type used for outbound messages.
    - `outboundBlockConfirmations` - the number of block confirmations for outbound messages.
    - `oracle` - the address of the Oracle contract.

    <br>

    Below is an example of the Gnosis configuration

    ```json
    {
         "ethereum": {
             "safeAddress": "0xa36B7e7894aCfaa6c35A8A0EC630B71A6B8A6D22",
             "url": "https://safe-transaction.mainnet.gnosis.io/"
         },
         "bsc": {
             "safeAddress": "0x4755D44c1C196dC524848200B0556A09084D1dFD",
             "url": "https://safe-transaction.bsc.gnosis.io/"
         },
         "avalanche": {
             "safeAddress": "0x4FF2C33FD9042a76eaC920C037383E51659417Ee",
             "url": "https://safe-transaction.avalanche.gnosis.io/"
         }
    }
    ```
    For each chain you need to specify your Gnosis safe address and Gnosis Safe API url. You can find the list of supported chains and API urls in [Gnosis Safe documentation](https://docs.safe.global/learn/safe-core/safe-core-api/available-services).

