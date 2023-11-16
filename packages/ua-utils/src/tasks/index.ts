import { task, types } from "hardhat/config"

import "./getDefaultConfig"

import wireAll from "./wireAll"
import setConfig from "./setConfig"
import getConfig from "./getConfig"
import checkWireAllConfig from "./checkWireAllConfig"

task(
    "setConfig",
    "sets Send and Receive Messaging Library versions and a custom application config for contracts implementing ILayerZeroUserApplicationConfig interface",
    setConfig
)
    .addParam("configPath", "the application config file path")
    .addOptionalParam(
        "name",
        "name of the deployed contracts. Should be specified if the same contract deployed on different chains and the deployment information is located in the deployments folder"
    )
    .addOptionalParam("address", "address of the deployed contracts. Should be specified if the contract address is the same on all chains")
    .addOptionalParam("gnosisConfigPath", "the path to a file with Gnosis config. If specified, the transactions will be sent to Gnosis")
    .addOptionalParam("gasLimit", "override execution gasLimit")

task("getConfig", "outputs the application's Send and Receive Messaging Library versions and the config for remote networks", getConfig)
    .addParam("remoteNetworks", "comma separated list of remote networks")
    .addOptionalParam(
        "name",
        "name of the deployed contract. Should be specified only if the deployment information is located in the deployments folder"
    )
    .addOptionalParam("address", "the contract address")

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

task("wireAll", "", wireAll)
    .addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addOptionalParam("noPrompt", "no prompt", false, types.boolean)
    .addOptionalParam(
        "configPath",
        "Optional config path. Default: ./constants/wireUpConfig.json",
        "./constants/wireUpConfig.json",
        types.string
    )
    .addOptionalParam("n", "send to gnosis", false, types.boolean)
    .addOptionalParam("gasLimit", "override execution gasLimit")
    .addOptionalParam(
        "gnosisConfigPath",
        "Optional config path. Default: ./constants/gnosisConfig.json",
        "./constants/gnosisConfig.json",
        types.string
    )
