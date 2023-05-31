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