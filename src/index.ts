import { task, types } from "hardhat/config";

task("setConfig", "sets Send and Receive Messaging Library versions and a custom application config for contracts implementing ILayerZeroUserApplicationConfig interface", require("./setConfig"))
	.addParam("configPath", "the application config file path")
	.addOptionalParam("name", "name of the deployed contracts. Should be specified if the same contract deployed on different chains and the deployment information is located in the deployments folder")
	.addOptionalParam("address", "address of the deployed contracts. Should be specified if the contract address is the same on all chains")
	.addOptionalParam("gnosisConfigPath", "the path to a file with Gnosis config. If specified, the transactions will be sent to Gnosis")

task("getDefaultConfig", "outputs the default Send and Receive Messaging Library versions and the default application config", require("./getDefaultConfig"))
	.addParam("networks", "comma separated list of networks")

task("getConfig", "outputs the application's Send and Receive Messaging Library versions and the config for remote networks", require("./getConfig"))
	.addParam("remoteNetworks", "comma separated list of remote networks")
	.addOptionalParam("name", "name of the deployed contract. Should be specified only if the deployment information is located in the deployments folder")
	.addOptionalParam("address", "the contract address");

task("wireAll", "", require("./wireAll"))
	.addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addParam("noPrompt", "no prompt", false, types.boolean)
	.addOptionalParam("localChains", "comma separated list of networks to config on")
	.addOptionalParam("remoteChains", "comma separated list of networks to config on")
	.addOptionalParam("configPath", "option config path")
	.addOptionalParam("n", "send to gnosis", false, types.boolean)
// npx hardhat --network ethereum-testnet wireAll --e testnet --config-path "./constants/oftv2Config/wireUpConfig.json"

task("checkConfig", "", require("./checkConfig"))
	.addParam("e", "the environment ie: mainnet, testnet or sandbox")
	.addFlag("u", "show use custom adapter params")
	.addFlag("t", "show trusted remote lookup")
	.addFlag("m", "show min destination gas lookup")
	.addParam("chains", "comma separated list of networks")
    .addOptionalParam("contract", "name of contract")
    .addOptionalParam("addresses", "addresses of contracts in same order as chains")
    .addOptionalParam("proxyContract", "name of proxy contract")
    .addOptionalParam("proxyChain", "name of proxy chain")
// npx hardhat checkConfig --e testnet --u --t --m --contract ExampleOFTV2 --chains ethereum-testnet,scroll-testnet
// npx hardhat checkConfig --e testnet --u --t --m --chains ethereum-testnet,scroll-testnet --addresses "0xD90E022dE858DfDFC3C0f66b0D9ACD12CA6eA3Ec,0x137d4e9C2431A3DCBa6e615E9438F2c558353a17"
