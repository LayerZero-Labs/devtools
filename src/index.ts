import { task, types } from "hardhat/config";

task("setConfig", "sets send and receive messaging library versions and a custom config for contracts inheriting LzApp", require("./setConfig"))
	.addParam("networks", "comma separated list of networks where contracts are deployed")
	.addOptionalParam("contract", "name of the deployed contract")
	.addOptionalParam("gnosis", "send to gnosis", false, types.boolean);