import { task, types } from "hardhat/config";

task("setConfig", "sets send and receive messaging library versions and a custom config for contracts inheriting LzApp", require("./setConfig"))
	.addParam("networks", "comma separated list of networks where contracts are deployed")
	.addParam("uaConfig", "the path to a file with custom UA config")
	.addOptionalParam("contractName", "name of the deployed contract. Should be specified if the same contract deployed on different chains and the deployment information is located in the deployments folder")
	.addOptionalParam("uaAddressesConfig", "the path to a file with contract addresses and names. Should be specified if contract names are different on different chains or the deployment information is absent")
	.addOptionalParam("gnosisConfig", "the path to a file with Gnosis config. If specified, the transactions will be sent to Gnosis");

task("wireAll", "", require("./wireAll"))
    .addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addParam("localChains", "comma seperated list of networks to config on")
    .addParam("remoteChains", "comma seperated list of networks to config on")
    .addParam("noPrompt", "no prompt", false, types.boolean)
    .addOptionalParam("configPath", "option config path")
    .addOptionalParam("n", "send to gnosis", false, types.boolean)
