import { executeTransaction, executeGnosisTransactions, getContractAt, getWalletContractAt, Transaction } from "./utils/crossChainHelper";
import { promptToProceed, writeToCsv } from "./utils/helpers";
import { utils, constants } from "ethers";

const fs = require("fs").promises;
const { LZ_ADDRESS, CHAIN_ID } = require("@layerzerolabs/lz-sdk");
const ENVIRONMENTS = require("../constants/environments.json");
const MAINNET_CONFIG = require("../constants/uaMainnetConfig.json");
const TESTNET_CONFIG = require("../constants/uaTestnetConfig.json");
const UA_ADDRESSES = require("../constants/uaAddresses.json");
const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json");

const VERSION = 2;

// Application config types from UltraLightNodeV2 contract
const CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 1;
const CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS = 2;
const CONFIG_TYPE_RELAYER = 3;
const CONFIG_TYPE_OUTBOUND_PROOF_TYPE = 4;
const CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS = 5;
const CONFIG_TYPE_ORACLE = 6;

const endpointAbi = [
	"function uaConfigLookup(address) view returns (tuple(uint16, uint16, address, address))", 
	"function getConfig(uint16 _version, uint16 _chainId, address _userApplication, uint _configType) external view returns (bytes memory)"
]

const uaAbi = [
	"function setConfig(uint16 _version, uint16 _chainId, uint _configType, bytes calldata _config)", 
	"function setSendVersion(uint16 _version)", 
	"function setReceiveVersion(uint16 _version)"
]

module.exports = async (taskArgs: any, hre: any) => {
	// const environment = taskArgs.e
	// let networks
	let config = TESTNET_CONFIG;
	// if (environment === "mainnet") {
	//     networks = ENVIRONMENTS[environment]
	//     config = MAINNET_CONFIG
	// } else if (environment === "testnet") {
	//     networks = ENVIRONMENTS[environment]
	//     config = TESTNET_CONFIG
	// } else {
	//     console.log("Invalid environment")
	// 	return
	// }

	const networks = ["goerli", "optimism-goerli", "bsc-testnet", "fuji", "arbitrum-goerli"];
	const localNetworks = networks;
	const remoteNetworks = networks;

	const transactionByNetwork: any = (
		await Promise.all(
			localNetworks.map(async (localNetwork) => {
				const transactions: Transaction[] = [];
				const uaAddress = UA_ADDRESSES[localNetwork];

				if (uaAddress === undefined) return;

				const endpoint = await getContractAt(hre, localNetwork, "Endpoint", endpointAbi, LZ_ENDPOINTS[localNetwork]);
				const ua = await getContractAt(hre, localNetwork, "UserApplication", uaAbi, uaAddress);
				const chainId = CHAIN_ID[localNetwork];
				const localNetworkConfig = config[localNetwork];

				if (localNetworkConfig === undefined) return;
				const uaConfig = await endpoint.uaConfigLookup(ua.address);

				if (localNetworkConfig.sendVersion !== undefined) {
					transactions.push(...(await setSendVersion(chainId, ua, uaConfig[0], localNetworkConfig.sendVersion)));
				}

				if (localNetworkConfig.receiveVersion !== undefined) {
					transactions.push(...(await setReceiveVersion(chainId, ua, uaConfig[1], localNetworkConfig.receiveVersion)));
				}

				await Promise.all(
					remoteNetworks.map(async (remoteNetwork) => {
						if (localNetwork === remoteNetwork || UA_ADDRESSES[remoteNetwork] === undefined) return;
						const remoteChainId = CHAIN_ID[remoteNetwork];

						if (localNetworkConfig.inboundProofLibraryVersion !== undefined) {
							transactions.push(...(await setConfig(chainId, remoteChainId, endpoint, ua, CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION, "uint16", localNetworkConfig.inboundProofLibraryVersion)));
						}

						if (localNetworkConfig.inboundBlockConfirmations !== undefined) {
							transactions.push(...(await setConfig(chainId, remoteChainId, endpoint, ua, CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS, "uint64", localNetworkConfig.inboundBlockConfirmations)));
						}

						if (localNetworkConfig.relayer !== undefined) {
							transactions.push(...(await setConfig(chainId, remoteChainId, endpoint, ua, CONFIG_TYPE_RELAYER, "address", localNetworkConfig.relayer)));
						}

						if (localNetworkConfig.outboundProofType !== undefined) {
							transactions.push(...(await setConfig(chainId, remoteChainId, endpoint, ua, CONFIG_TYPE_OUTBOUND_PROOF_TYPE, "uint16", localNetworkConfig.outboundProofType)));
						}

						if (localNetworkConfig.outboundBlockConfirmations !== undefined) {
							transactions.push(...(await setConfig(chainId, remoteChainId, endpoint, ua, CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS, "uint64", localNetworkConfig.outboundBlockConfirmations)));
						}

						if (localNetworkConfig.oracle !== undefined) {
							transactions.push(...(await setConfig(chainId, remoteChainId, endpoint, ua, CONFIG_TYPE_ORACLE, "address", localNetworkConfig.oracle)));
						}
					})
				);
				return {
					network: localNetwork,
					transactions,
				};
			})
		)
	).filter((x) => x);

	let totalTransactionsNeedingChange: number = 0;
	const columns = ["needChange", "chainId", "remoteChainId", "contractAddress", "methodName", "args", "diff"];

	transactionByNetwork.forEach(({ network, transaction }) => {
		console.log(`================================================`);
		console.log(`${network} transactions`);
		console.log(`================================================`);
		const transactionsNeedingChange = transactions.filter((tx) => tx.needChange);
		totalTransactionsNeedingChange += transactionsNeedingChange.length;

		if (!transactionsNeedingChange.length) {
			console.log("No change needed\n");
		} else {
			console.table(transactionsNeedingChange, columns);
		}
	});

	writeToCsv("./setConfigTxs.csv", columns, transactionByNetwork);

	if (totalTransactionsNeedingChange === 0) return; 

	await promptToProceed(taskArgs.gnosis 
		? "Would you like to proceed with above instructions in Gnosis?" 
		: "Would you like to proceed with above instruction?");
	
	const errs: any[] = [];
	const print: any = {};
	let previousPrintLine = 0;
	const printResult = () => {
		if (previousPrintLine) {
			process.stdout.moveCursor(0, -previousPrintLine);
		}
		if (Object.keys(print)) {
			previousPrintLine = Object.keys(print).length + 4;
			console.table(Object.keys(print).map((network) => ({ network, ...print[network] })));
		}
	};

	if (taskArgs.gnosis) {
		 await Promise.all(
			transactionByNetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction) => transaction.needChange);

				print[network] = print[network] || { requests: "1/1" };
				print[network].current = `executeGnosisTransactions: ${transactionToCommit}`;
				try {
					await executeGnosisTransactions(hre, network, transactionToCommit);
					print[network].requests = "1/1";
					printResult();
				} catch (err: any) {
					console.log(`Failing calling executeGnosisTransactions for network ${network} with err ${err}`);
					errs.push({	network, err });
					print[network].current = err.message;
					print[network].err = true;
					printResult();
				}
			})
		);
	} 
	else {
		await Promise.all(
			transactionByNetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction) => transaction.needChange);
				const contract = await getWalletContractAt(hre, network, "UserApplication", uaAbi, UA_ADDRESSES[network]);

				let successTx = 0;
				print[network] = print[network] || { requests: `${successTx}/${transactionToCommit.length}` };
				for (let transaction of transactionToCommit) {
					print[network].current = `${transaction.methodName}(${transaction.args})`;
					printResult();
					try {
						const tx = await executeTransaction(hre, network, transaction, contract);
						print[network].past = `${transaction.methodName}(${transaction.args}) (${tx.transactionHash})`;
						successTx++;
						print[network].requests = `${successTx}/${transactionToCommit.length}`;
						printResult();
					} catch (err: any) {
						console.log(`Failing calling ${transaction.contractName}.${transaction.methodName} for network ${network} with err ${err}`);
						console.log(err);
						errs.push({ network, err });
						print[network].current = err;
						print[network].err = true;
						printResult();
						break;
					}
				}
			})
		);
	}
};

const setSendVersion = async (chainId: string, ua: any, currentSendVersion: any, newSendVersion: any): Promise<Transaction[]> => {
	const needChange = currentSendVersion !== newSendVersion;
	const contractAddress = ua.address;
	const methodName = "setSendVersion";
	//const remoteChainId = undefined
	const args = [newSendVersion];
	const calldata = ua.interface.encodeFunctionData(methodName, args);
	const diff = needChange ? { oldValue: currentSendVersion, newValue: newSendVersion } : undefined;

	return [{ needChange, chainId, contractAddress, methodName, args, calldata, diff }];
};

const setReceiveVersion = async (chainId: string, ua: any, currentReceiveVersion: any, newReceiveVersion: any): Promise<Transaction[]> => {
	const needChange = currentReceiveVersion !== newReceiveVersion;
	const contractAddress = ua.address;
	const methodName = "setReceiveVersion";
	//const remoteChainId = undefined
	const args = [newReceiveVersion];
	const calldata = ua.interface.encodeFunctionData(methodName, args);
	const diff = needChange ? { oldValue: currentReceiveVersion, newValue: newReceiveVersion } : undefined;

	return [{ needChange, chainId, contractAddress, methodName, args, calldata, diff }];
};

const setConfig = async (chainId: string, remoteChainId: string, endpoint: any, ua: any, configType: number, configValueType: string, newValue: any): Promise<Transaction[]> => {
	const currentConfig = await endpoint.getConfig(VERSION, remoteChainId, ua.address, configType);
	const [oldValue] = utils.defaultAbiCoder.decode([configValueType], currentConfig) as any;
	const newConfig = utils.defaultAbiCoder.encode([configValueType], [newValue]);
	const contractAddress = ua.address;
	const methodName = "setConfig";
	const args = [VERSION, remoteChainId, configType, newConfig];
	const needChange = oldValue !== newValue;
	const calldata = ua.interface.encodeFunctionData(methodName, args);
	const diff = needChange ? { oldValue, newValue } : undefined;

	return [{ needChange, chainId, remoteChainId, contractAddress, methodName, args, calldata, diff }];
};
