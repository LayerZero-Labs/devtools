# ua-tasks

A set of common tasks for contracts integrating LayerZero

## Installation

```sh
$ npm install @layerzerolabs/ua-tasks
```

Import the plugin in your `hardhat.config.js`:

```js
require("@layerzerolabs/ua-tasks");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@layerzerolabs/ua-tasks";
```
The plugin relies on `hardhat-ethers` package, so make sure to import it as well in your `hardhat.config`

## Tasks

The package adds the following tasks:

 - `getDefaultConfig` returns the default configuration for the specified chains.

	Usage:

	```bash
	npx hardhat getDefaultConfig --networks ethereum,bsc,polygon,avalanche
	```
 - `getConfig` returns the configuration of the specified contract.

	Parameters:
	- `address` - the contract address. An optional parameter. Either contract name or contract address must be specified.
	- `name` - the contract name. An optional parameter. It must be specified only if the contract was deployed using `hardhat-deploy` task and the deployments information is located in the deployments folder.
	- `network` - the network the contract is deployed to.
	- `remote-networks` - a comma separated list of remote networks the contract is configured with.

	Usage:	

	```bash
	npx hardhat getConfig --network ethereum --remote-networks bsc,polygon,avalanche --name OFT
	```
- `setConfig` sets the configuration of the specified contract.
   
   Parameters:
   - `config-path` - the relative path to a file containing the configuration.
   - `address` - the address of the deployed contracts. An optional parameter. It should be specified if the contract address is the same on all chains.
   - `name` - the name of the deployed contracts. An optional parameter. It should be specified only if the same contract deployed on all chains using `hardhat-deploy` task and the deployment information is located in the deployments folder.
   - `gnosis-config-path` - the relative path to a file containing the gnosis configuration. An optional parameter. If specified, the transactions will be sent to Gnosis

   <br/>
   
   An example of the application configuration
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
					"relayer": "0xA27A2cA24DD28Ce14Fb5f5844b59851F03DCf182",
					"outboundProofType": 1,
					"outboundBlockConfirmations": 20,
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
					"relayer": "0x902F09715B6303d4173037652FA7377e5b98089E",
					"outboundProofType": 1,
					"outboundBlockConfirmations": 15,
					"oracle": "0x5a54fe5234E811466D5366846283323c954310B2"
				}
			]
		}
   }
   ```
   The top level elements represent chains the contracts are deployed to. The configuration section for each chain has the following fields
    - `address`
	- `name`
	- `sendVersion`
	- `receiveVersion`
	- `remoteConfigs`