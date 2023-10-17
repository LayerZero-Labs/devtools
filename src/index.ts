import { task, types } from "hardhat/config";
import wireAll from './wireAll';
import setConfig from './setConfig';
import getDefaultConfig from './getDefaultConfig';
import getConfig from './getConfig';
import checkWireAllConfig from './checkWireAllConfig';

task("setConfig", "sets Send and Receive Messaging Library versions and a custom application config for contracts implementing ILayerZeroUserApplicationConfig interface", setConfig)
	.addParam("configPath", "the application config file path")
	.addOptionalParam("name", "name of the deployed contracts. Should be specified if the same contract deployed on different chains and the deployment information is located in the deployments folder")
	.addOptionalParam("address", "address of the deployed contracts. Should be specified if the contract address is the same on all chains")
	.addOptionalParam("gnosisConfigPath", "the path to a file with Gnosis config. If specified, the transactions will be sent to Gnosis")

task("getDefaultConfig", "outputs the default Send and Receive Messaging Library versions and the default application config", getDefaultConfig)
	.addParam("networks", "comma separated list of networks")

task("getConfig", "outputs the application's Send and Receive Messaging Library versions and the config for remote networks", getConfig)
	.addParam("remoteNetworks", "comma separated list of remote networks")
	.addOptionalParam("name", "name of the deployed contract. Should be specified only if the deployment information is located in the deployments folder")
	.addOptionalParam("address", "the contract address");

task("checkWireAllConfig", "", checkWireAllConfig)
	.addParam("e", "the environment ie: mainnet, testnet or sandbox")
	.addFlag("u", "show use custom adapter params")
	.addFlag("t", "show trusted remote lookup")
	.addFlag("m", "show min destination gas lookup")
	.addParam("chains", "comma separated list of networks")
    .addOptionalParam("contract", "name of contract")
    .addOptionalParam("addresses", "addresses of contracts in same order as chains")
    .addOptionalParam("proxyContract", "name of proxy contract")
    .addOptionalParam("proxyChain", "name of proxy chain")
// npx hardhat checkConfig --e testnet --u --t --m --chains ethereum-testnet,arbitrum-testnet --contract ExampleOFTV2
// npx hardhat checkConfig --e testnet --u --t --m --chains ethereum-testnet,arbitrum-testnet,optimism-testnet --contract OFTV2 --proxy-contract ProxyOFTV2 --proxy-chain optimism-testnet
// npx hardhat checkConfig --e testnet --u --t --m --chains ethereum-testnet,arbitrum-testnet,optimism-testnet --addresses "0xD90E022dE858DfDFC3C0f66b0D9ACD12CA6eA3Ec,0x137d4e9C2431A3DCBa6e615E9438F2c558353a17,0x27631753FC88e7b45a46679B9Cd2e06378cB43dC"

task("wireAll", "", wireAll)
	.addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addOptionalParam("noPrompt", "no prompt", false, types.boolean)
	.addOptionalParam("configPath", "Optional config path. Default: ./constants/wireUpConfig.json", "./constants/wireUpConfig.json", types.string)
	.addOptionalParam("n", "send to gnosis", false, types.boolean)
	.addOptionalParam("gasLimit", "override execution gasLimit")
    .addOptionalParam("gnosisConfigPath", "Optional config path. Default: ./constants/gnosisConfig.json", "./constants/gnosisConfig.json", types.string)
// npx hardhat --network ethereum-testnet wireAll --e testnet --config-path "./constants/oftv2Config/wireUpConfig.json"
