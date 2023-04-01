import { configExist, getConfig } from "./utils/fileConfigHelper";
import { executeTransaction, executeGnosisTransactions, getContractAt, getWalletContractAt, Transaction, getContract, getWalletContract, getApplicationConfig } from "./utils/crossChainHelper";
import { promptToProceed, writeToCsv, logError, logWarning, printTransactions, logSuccess } from "./utils/helpers";
import { utils, BigNumber } from "ethers";
const { LZ_ADDRESS, CHAIN_ID } = require("@layerzerolabs/lz-sdk");
const { ENDPOINT_ABI, MESSAGING_LIBRARY_ABI, USER_APPLICATION_ABI } = require("./constants/abi"); 

// Application config types from UltraLightNodeV2 contract
const CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 1;
const CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS = 2;
const CONFIG_TYPE_RELAYER = 3;
const CONFIG_TYPE_OUTBOUND_PROOF_TYPE = 4;
const CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS = 5;
const CONFIG_TYPE_ORACLE = 6;

module.exports = async (taskArgs: any, hre: any) => {
	const configPath = taskArgs.configPath;
	const name = taskArgs.name;
	const address = taskArgs.address;
	const gnosisConfigPath = taskArgs.gnosisConfigPath;
	const sendToGnosis = gnosisConfigPath && configExist(gnosisConfigPath);

	if (!configExist(configPath)) {
		logError(`User application config file is not found`);
		return;
	}

	const config = getConfig(configPath);
	const networks = taskArgs.networks.split(",");

	const transactionByNetwork: any[] = (
		await Promise.all(
			networks.map(async (network: string) => {
				const transactions: Transaction[] = [];
				const chainId = CHAIN_ID[network];
				const networkConfig = config[network];

				if (!networkConfig) return;

				const endpoint = await getContractAt(hre, network, "Endpoint", ENDPOINT_ABI, LZ_ADDRESS[network]);
				const contractName = name ?? networkConfig.name;
				const contractAddress = address ?? networkConfig.address;
				
				if (!contractName && !contractAddress) {
					logWarning(`Contract information isn't found for ${network}`);
					return;
				}

				const ua = contractName ? await getContract(hre, network, contractName) : await getContractAt(hre, network, "UserApplication", USER_APPLICATION_ABI, contractAddress);							
				const uaConfig = await endpoint.uaConfigLookup(ua.address);
				const sendLibraryAddress = uaConfig.sendVersion === 0 ? await endpoint.defaultSendLibrary() : uaConfig.sendLibrary;
				const sendLibrary = await hre.ethers.getContractAt(MESSAGING_LIBRARY_ABI, sendLibraryAddress);
				let receiveLibrary: any;

				if (uaConfig.sendVersion !== uaConfig.receiveVersion) {
					const receiveLibraryAddress = uaConfig.receiveVersion === 0 ? await endpoint.defaultReceiveLibraryAddress() : uaConfig.receiveLibraryAddress;
					receiveLibrary = await hre.ethers.getContractAt(MESSAGING_LIBRARY_ABI, receiveLibraryAddress);
				}

				if (networkConfig.sendVersion) {
					transactions.push(...(await setSendVersion(chainId, ua, uaConfig.sendVersion, networkConfig.sendVersion)));
				}

				if (networkConfig.receiveVersion) {
					transactions.push(...(await setReceiveVersion(chainId, ua, uaConfig.receiveVersion, networkConfig.receiveVersion)));
				}

				const remoteConfigs = networkConfig.remoteConfigs;
				const newSendVersion = networkConfig.sendVersion ?? uaConfig.sendVersion;
				const newReceiveVersion = networkConfig.receiveVersion ?? uaConfig.receiveVersion;

				if (remoteConfigs) {
					await Promise.all(
						remoteConfigs.map(async (newConfig: any) => {
							if (newConfig.remoteChain === network) return;

							const oldConfig = await getApplicationConfig(newConfig.remoteChain, sendLibrary, receiveLibrary, contractAddress);
							const remoteChainId = CHAIN_ID[newConfig.remoteChain];							

							if (newConfig.inboundProofLibraryVersion) {
								transactions.push(...(await setConfig(newReceiveVersion, chainId, remoteChainId, ua, CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION, "uint16", oldConfig.inboundProofLibraryVersion, newConfig.inboundProofLibraryVersion)));
							}

							if (newConfig.inboundBlockConfirmations) {
								transactions.push(...(await setConfig(newReceiveVersion, chainId, remoteChainId, ua, CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS, "uint64", oldConfig.inboundBlockConfirmations, newConfig.inboundBlockConfirmations)));
							}

							if (newConfig.relayer) {
								transactions.push(...(await setConfig(newSendVersion, chainId, remoteChainId, ua, CONFIG_TYPE_RELAYER, "address", oldConfig.relayer, newConfig.relayer)));
							}

							if (newConfig.outboundProofType) {
								transactions.push(...(await setConfig(newSendVersion, chainId, remoteChainId, ua, CONFIG_TYPE_OUTBOUND_PROOF_TYPE, "uint16", oldConfig.outboundProofType, newConfig.outboundProofType)));
							}

							if (newConfig.outboundBlockConfirmations) {
								transactions.push(...(await setConfig(newSendVersion, chainId, remoteChainId, ua, CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS, "uint64", oldConfig.outboundBlockConfirmations.toNumber(), newConfig.outboundBlockConfirmations)));
							}

							if (newConfig.oracle) {
								transactions.push(...(await setConfig(newSendVersion, chainId, remoteChainId, ua, CONFIG_TYPE_ORACLE, "address", oldConfig.oracle, newConfig.oracle)));
							}
						})
					);
				}
				return {
					network: network,
					transactions,
				};
			})
		)
	).filter((x) => x);

	const columns = ["chainId", "remoteChainId", "contractAddress", "functionName", "args", "diff"];
	const changeNeeded = printTransactions(columns, transactionByNetwork);
	writeToCsv("setConfigTransactions.csv", columns, transactionByNetwork);

	if (!changeNeeded) return;

	await promptToProceed(`Would you like to proceed with the above instructions ${sendToGnosis ? "in Gnosis?" : "?"}`);
	
	const errors: any[] = [];
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

	if (sendToGnosis) {
		const gnosisConfig = getConfig(gnosisConfigPath);
		 await Promise.all(
			transactionByNetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction: Transaction) => transaction.needChange);
				print[network] = print[network] || { requests: "1/1" };
				print[network].current = `executeGnosisTransactions: ${transactionToCommit}`;
				try {
					await executeGnosisTransactions(hre, network, gnosisConfig, transactionToCommit);
					print[network].requests = "1/1";					
				} catch (err: any) {
					errors.push({ network, err });
					print[network].current = err.message;
					print[network].err = true;
				}
			})
		)
		printResult();
		if (errors.length) {
			logError(`\nFinished with ${errors.length === 1 ? "an error" : `${errors.length} errors`}`, false);
			errors.forEach(x => {
				console.log(x.err)
				console.log()
			})
		}
	} 
	else {
		await Promise.all(
			transactionByNetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction: Transaction) => transaction.needChange);
				const networkConfig = config[network];
				const contractName = name ?? networkConfig.name;
				const contractAddress = address ?? networkConfig.address;
				const ua = contractName 
					? await getWalletContract(hre, network, contractName) 
					: await getWalletContractAt(hre, network, "UserApplication", USER_APPLICATION_ABI, contractAddress);

				let successTx = 0;
				print[network] = print[network] || { requests: `${successTx}/${transactionToCommit.length}` };
				for (let transaction of transactionToCommit) {
					print[network].current = `${transaction.functionName}(${transaction.args})`;
					printResult();
					try {
						const tx = await executeTransaction(hre, network, transaction, ua);
						print[network].past = `${transaction.functionName}(${transaction.args}) (${tx.transactionHash})`;
						successTx++;
						print[network].requests = `${successTx}/${transactionToCommit.length}`;
						printResult();
					} catch (err: any) {
						logError(`Failing to call ${transaction.contractName}.${transaction.functionName} on ${network} with an error ${err}`);
						errors.push({ network, err });
						print[network].current = err;
						print[network].err = true;
						printResult();
						break;
					}
				}
			})
		);
	}

	if(!errors.length) {
		logSuccess("\nFinished successfully")
	}
}

const setSendVersion = async (chainId: string, ua: any, oldSendVersion: any, newSendVersion: any): Promise<Transaction[]> => {
	const needChange = oldSendVersion !== newSendVersion;
	const contractAddress = ua.address;
	const functionName = "setSendVersion";
	const args = [newSendVersion];
	const calldata = ua.interface.encodeFunctionData(functionName, args);
	const diff = needChange ? { oldValue: oldSendVersion, newValue: newSendVersion } : undefined;

	return [{ needChange, chainId, contractAddress, functionName, args, calldata, diff }];
};

const setReceiveVersion = async (chainId: string, ua: any, currentReceiveVersion: any, newReceiveVersion: any): Promise<Transaction[]> => {
	const needChange = currentReceiveVersion !== newReceiveVersion;
	const contractAddress = ua.address;
	const functionName = "setReceiveVersion";
	const args = [newReceiveVersion];
	const calldata = ua.interface.encodeFunctionData(functionName, args);
	const diff = needChange ? { oldValue: currentReceiveVersion, newValue: newReceiveVersion } : undefined;

	return [{ needChange, chainId, contractAddress, functionName, args, calldata, diff }];
};

const setConfig = async (configVersion: any, chainId: string, remoteChainId: string, ua: any, configType: number, configValueType: string, oldValue: any, newValue: any): Promise<Transaction[]> => {
	const newConfig = utils.defaultAbiCoder.encode([configValueType], [newValue]);
	const contractAddress = ua.address;
	const functionName = "setConfig";
	const args = [configVersion, remoteChainId, configType, newConfig];
	const needChange = oldValue !== newValue;
	const calldata = ua.interface.encodeFunctionData(functionName, args);
	const diff = needChange ? { oldValue, newValue } : undefined;

	return [{ needChange, chainId, remoteChainId, contractAddress, functionName, args, calldata, diff }];
}