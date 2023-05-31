import { Transaction, executeGnosisTransactions, executeTransaction, getContractAt, getContract } from "./utils/crossChainHelper";
import { promptToProceed, logError } from "./utils/helpers";
import { configExist, getConfig } from "./utils/fileConfigHelper";
import { CHAIN_ID, CHAIN_STAGE, ChainKey, ChainStage } from "@layerzerolabs/lz-sdk";
import { arrayToCsv } from "./utils/helpers";
import { writeFile } from "fs/promises";

const LzAppAbi = [
	"function setTrustedRemote(uint16 _srcChainId, bytes calldata _path)",
	"function setUseCustomAdapterParams(bool _useCustomAdapterParams)",
	"function setDefaultFeeBp(uint16 _feeBp)",
	"function setFeeBp(uint16 _dstChainId, bool _enabled, uint16 _feeBp)",
	"function setMinDstGas(uint16 _dstChainId, uint16 _packetType, uint _minGas)",
	"function useCustomAdapterParams() public view returns (bool) ",
	"function trustedRemoteLookup(uint16) public view returns (bytes)",
	"function minDstGasLookup(uint16, uint16) public view returns (uint)",
	"function defaultFeeBp() public view returns (uint16)",
	"function chainIdToFeeBps(uint16) public view returns (uint16, bool)",
];

module.exports = async function (taskArgs, hre) {
	if (!configExist(taskArgs.configPath)) {
		logError(`Wire up config file is not found.`);
		return;
	}

	if (taskArgs.n && !configExist(taskArgs.gnosisConfigPath)) {
		logError(`Gnosis config file not found`);
		return;
	}

	const WIRE_UP_CONFIG = getConfig(taskArgs.configPath);
	const signers = await hre.ethers.getSigners();
	console.log(`CURRENT SIGNER: ${signers[0].address}`);

	let localNetworks = Object.keys(WIRE_UP_CONFIG?.chainConfig)

	const env = taskArgs.e;

	let stage;
	if (env === "mainnet") {
		stage = ChainStage.MAINNET;
	} else if (env === "testnet") {
		stage = ChainStage.TESTNET;
	} else {
		console.log("Invalid environment ie: mainnet, testnet");
		return;
	}

	console.log(`************************************************`);
	console.log(`Computing diff`);
	console.log(`************************************************`);

	let transactionBynetwork: any = await Promise.all(
		localNetworks.map(async (localNetwork) => {
            // array of transactions to execute
            const transactions: Transaction[] = [];
            const remoteNetworks = Object.keys(WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig)

			let localContractNameOrAddress = getContractNameOrAddress(localNetwork, WIRE_UP_CONFIG);
			if (localContractNameOrAddress === undefined) {
				logError(`Invalid wire up config for localContractNameOrAddress.`);
				return;
			}

			// check if useCustomAdapterParams needs to be set
			// console.log(`WIRE_UP_CONFIG?.chainConfig?.[${localNetwork}]?.useCustomAdapterParams: ${WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.useCustomAdapterParams}`)
			const useCustomAdapterParams = WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.useCustomAdapterParams;
			if (useCustomAdapterParams) {
				transactions.push(...(await setUseCustomAdapterParams(hre, localNetwork, localContractNameOrAddress, useCustomAdapterParams)));
			}

			// check if defaultFeeBp needs to be set
			// console.log(`WIRE_UP_CONFIG?.chainConfig?.[${localNetwork}]?.defaultFeeBp: ${WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.defaultFeeBp}`)
			const defaultFeeBp = WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.defaultFeeBp;
			if (defaultFeeBp !== undefined) {
				transactions.push(...(await setDefaultFeeBp(hre, localNetwork, localContractNameOrAddress, defaultFeeBp)));
			}

			await Promise.all(
				remoteNetworks.map(async (remoteNetwork) => {
					// skip wiring itself
					if (localNetwork === remoteNetwork) return;
					const proxyChain = WIRE_UP_CONFIG?.proxyContractConfig?.chain;

					let remoteContractNameOrAddress = getContractNameOrAddress(remoteNetwork, WIRE_UP_CONFIG);
					if (remoteContractNameOrAddress === undefined) {
						logError(`Invalid wire up config for remoteContractNameOrAddress.`);
						return;
					}

					// setTrustedRemote
					// console.log({localNetwork, localContractNameOrAddress, remoteNetwork, remoteContractNameOrAddress})
					transactions.push(...(await setTrustedRemote(hre, localNetwork, localContractNameOrAddress, remoteNetwork, remoteContractNameOrAddress, taskArgs.e)));

					// console.log(`WIRE_UP_CONFIG?.chainConfig?.[${localNetwork}]?.remoteNetworkConfig?.[${remoteNetwork}]?.feeBpConfig: ${WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.feeBpConfig}`)
					// setFeeBp
					if (WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.feeBpConfig) {
						transactions.push(...(await setFeeBp(hre, localNetwork, localContractNameOrAddress, WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].feeBpConfig, CHAIN_ID[remoteNetwork])));
					}

					// console.log(`WIRE_UP_CONFIG?.chainConfig?.[${localNetwork}]?.remoteNetworkConfig?.[${remoteNetwork}]?.minDstGasConfig: ${WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.minDstGasConfig}`)
					// setMinDstGas
					if (WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.minDstGasConfig) {
						transactions.push(...(await setMinDstGas(hre, localNetwork, localContractNameOrAddress, WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].minDstGasConfig, CHAIN_ID[remoteNetwork])));
					}
				})
			);
			return {
				network: localNetwork,
				transactions: transactions,
			};
		})
	);

	const noChanges = transactionBynetwork.reduce((acc, { transactions }) => {
		acc += transactions.filter((transaction) => transaction.needChange).length;
		return acc;
	}, 0);
	if (noChanges == 0) {
		//early return
		console.log("No changes needed");
		return;
	}

	transactionBynetwork.forEach(({ network, transactions }) => {
		console.log(`************************************************`);
		console.log(`Transaction for ${network}`);
		console.log(`************************************************`);
		const transactionNeedingChange = transactions.filter((transaction) => transaction.needChange);
		if (!transactionNeedingChange.length) {
			console.log("No change needed");
		} else {
			console.table(transactionNeedingChange);
		}
	});

	const columns = ["needChange", "chainId", "remoteChainId", "contractName", "functionName", "args", "diff", "calldata"];

	const data = transactionBynetwork.reduce((acc, { network, transactions }) => {
		transactions.forEach((transaction) => {
			acc.push([
				network,
				...columns.map((key) => {
					if (typeof transaction[key] === "object") {
						return JSON.stringify(transaction[key]);
					} else {
						return transaction[key];
					}
				}),
			]);
		});
		return acc;
	}, []);
	await writeFile("./transactions.csv", arrayToCsv(["network"].concat(columns), data));

	console.log("Full configuration is written at:");
	console.log(`file:/${process.cwd()}/transactions.csv`);

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

	if (taskArgs.n) {
		await promptToProceed("Would you like to Submit to gnosis?", taskArgs.noPrompt);
		await Promise.all(
			transactionBynetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction) => transaction.needChange);

				print[network] = print[network] || { requests: `1/1` };
				print[network].current = `executeGnosisTransactions: ${transactionToCommit}`;
				try {
					const gnosisConfig = getConfig(taskArgs.gnosisConfigPath);
					await executeGnosisTransactions(hre, network, gnosisConfig, transactionToCommit);
					print[network].requests = `1/1`;
					printResult();
				} catch (err: any) {
					console.log(`Failing calling executeGnosisTransactions for network ${network} with err ${err}`);
					errs.push({
						network,
						err,
					});
					print[network].current = err.message;
					print[network].err = true;
					printResult();
				}
			})
		);
	} else {
		await promptToProceed("Would you like to run these transactions?", taskArgs.noPrompt);
		await Promise.all(
			transactionBynetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction) => transaction.needChange);

				let successTx = 0;
				print[network] = print[network] || { requests: `${successTx}/${transactionToCommit.length}` };
				for (let transaction of transactionToCommit) {
					print[network].current = `${transaction.contractName}.${transaction.functionName}`;
					printResult();
					try {
						const tx = await executeTransaction(hre, network, transaction);
						print[network].past = `${transaction.contractName}.${transaction.functionName} (${tx.transactionHash})`;
						successTx++;
						print[network].requests = `${successTx}/${transactionToCommit.length}`;
						printResult();
					} catch (err: any) {
						console.log(`Failing calling ${transaction.contractName}.${transaction.functionName} for network ${network} with err ${err}`);
						console.log(err);
						errs.push({
							network,
							err,
						});
						print[network].current = err;
						print[network].err = true;
						printResult();
						break;
					}
				}
			})
		);
	}

	if (!errs.length) {
		console.log("Wired all networks successfully");
	} else {
		console.log(errs);
	}
};

// encode the calldata into the 'calldata' the transaction requires to be sent
// hre: the hardhat runtime environment, for access to hre.web3.utils.keccak256()
// functionName: "setPause" or "setRemoteUln"  ie: the string name of the contract function
// params: ['bool','uint256'] ie: a string array of the types of the function parameters
// args: [ true, 1234 ] ie: the array of values that correspond to the types in params
//
// return: string like: "0xbedb86fb0000000000000000000000000000000000000000000000000000000000000001"
export function generateCalldata(hre: any, functionName: string, params: string[], args: any) {
	return `${hre.web3.utils.keccak256(`${functionName}(${params.join(",")})`).substring(0, 10)}${hre.web3.eth.abi.encodeParameters(params, args).substring(2)}`;
}

async function setUseCustomAdapterParams(hre: any, localNetwork: string, localContractNameOrAddress: string, useCustom: boolean): Promise<Transaction[]> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}
	const cur = await localContract.useCustomAdapterParams();
	const needChange = cur !== useCustom;

	// function setUseCustomAdapterParams(bool _useCustomAdapterParams)
	const functionName = "setUseCustomAdapterParams";
	const params = ["bool"];
	let args = [useCustom];

	const tx: any = {
		needChange,
		chainId: CHAIN_ID[localNetwork],
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: generateCalldata(hre, functionName, params, args),
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ useCustomAdapterParams: { oldValue: cur, newValue: useCustom } });
	}
	return [tx];
}

async function setDefaultFeeBp(hre: any, localNetwork: string, localContractNameOrAddress: string, defaultFeeBp: number): Promise<Transaction[]> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}
	const cur = await localContract.defaultFeeBp();
	const needChange = cur !== defaultFeeBp;

	// function setDefaultFeeBp(uint16 _feeBp)
	const functionName = "setDefaultFeeBp";
	const params = ["uint16"];
	let args = [defaultFeeBp];

	const tx: any = {
		needChange,
		chainId: CHAIN_ID[localNetwork],
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: generateCalldata(hre, functionName, params, args),
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ defaultFeeBp: { oldValue: cur, newValue: defaultFeeBp } });
	}
	return [tx];
}

async function setFeeBp(hre: any, localNetwork: string, localContractNameOrAddress: string, feeBpConfig: any, remoteChainId: number): Promise<Transaction[]> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}
	const feeConfig = await localContract.chainIdToFeeBps(remoteChainId);
	const curFeeBp = feeConfig[0];
	const curEnabled = feeConfig[1];
	const needChange = curFeeBp !== feeBpConfig.feeBp || curEnabled !== feeBpConfig.enabled;

	// function setFeeBp(uint16 _dstChainId, bool _enabled, uint16 _feeBp)
	const functionName = "setFeeBp";
	const params = ["uint16", "bool", "uint16"];
	let args = [remoteChainId, feeBpConfig.enabled, feeBpConfig.feeBp];

	const tx: any = {
		needChange,
		chainId: CHAIN_ID[localNetwork],
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: generateCalldata(hre, functionName, params, args),
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ feeBp: { oldFeeBpValue: curFeeBp, newFeeBpValue: feeBpConfig.feeBp, oldEnabledFee: curEnabled, newEnabledFee: feeBpConfig.enabled } });
	}
	return [tx];
}

async function setMinDstGas(hre: any, localNetwork: string, localContractNameOrAddress: string, minDstGasConfig: [], remoteChainId: number): Promise<Transaction[]> {
	const txns: Transaction[] = [];
	for (let i = 0; i < minDstGasConfig.length; i++) {
		const packetType = i;
		const minGas = minDstGasConfig[packetType];
		let localContract;
		if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
			localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
		} else {
			localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
		}
		const cur = (await localContract.minDstGasLookup(remoteChainId, packetType)).toNumber();
		const needChange = cur !== minGas;

		// function setMinDstGas(uint16 _dstChainId, uint16 _packetType, uint _minGas)
		const functionName = "setMinDstGas";
		const params = ["uint16", "uint16", "uint256"];
		let args = [remoteChainId, packetType, minGas];
		const tx: any = {
			needChange,
			chainId: CHAIN_ID[localNetwork],
			contractName: localContractNameOrAddress,
			functionName,
			args: args,
			calldata: generateCalldata(hre, functionName, params, args),
		};
		if (tx.needChange) {
			tx.diff = JSON.stringify({ oldValue: cur, newValue: minGas });
		}
		txns.push(tx);
	}
	return txns;
}

async function setTrustedRemote(hre: any, localNetwork: string, localContractNameOrAddress: string, remoteNetwork: string, remoteContractNameOrAddress: string, environment: string): Promise<Transaction[]> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}

	let remoteContract;
	if (hre.ethers.utils.isAddress(remoteContractNameOrAddress)) {
		remoteContract = await getContractAt(hre, remoteNetwork, LzAppAbi, remoteContractNameOrAddress);
	} else {
		remoteContract = await getContract(hre, remoteNetwork, remoteContractNameOrAddress);
	}

	const remoteContractAddress = await remoteContract.address;
	const desiredTrustedRemote = hre.ethers.utils.solidityPack(["bytes"], [remoteContractAddress + localContract.address.substring(2)]);
	const remoteChainId = CHAIN_ID[remoteNetwork];
	const cur = await localContract.trustedRemoteLookup(remoteChainId);
	const needChange = cur != desiredTrustedRemote;

	// function setTrustedRemote(uint16 _srcChainId, bytes calldata _path)
	const functionName = "setTrustedRemote";
	const params = ["uint16", "bytes"];
	let args = [remoteChainId, desiredTrustedRemote];

	const tx: any = {
		needChange,
		chainId: CHAIN_ID[localNetwork],
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: generateCalldata(hre, functionName, params, args),
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ trustedRemote: { oldValue: cur, newValue: desiredTrustedRemote } });
	}
	return [tx];
}

export function validateStageOfNetworks(stage: ChainStage, localNetworks: string[], remoteNetworks: string[]) {
	const networks = getNetworkForStage(stage);
	localNetworks.forEach((network) => {
		if (!networks.includes(network)) {
			throw new Error(`Invalid network: ${network} for stage: ${stage}`);
		}
	});
	remoteNetworks.forEach((network) => {
		if (!networks.includes(network)) {
			throw new Error(`Invalid network: ${network} for stage: ${stage}`);
		}
	});
}

function getNetworkForStage(stage: ChainStage) {
	const networks: string[] = [];
	for (const keyType in ChainKey) {
		const key = ChainKey[keyType as keyof typeof ChainKey];
		if (CHAIN_STAGE[key] === stage) {
			networks.push(key);
		}
	}
	return networks;
}

function getContractNameOrAddress(chain: string, WIRE_UP_CONFIG: any) {
	let contractNameOrAddress;
	const proxyChain = WIRE_UP_CONFIG?.proxyContractConfig?.chain;
	if (proxyChain === chain) {
		if (WIRE_UP_CONFIG?.proxyContractConfig?.name) {
			contractNameOrAddress = WIRE_UP_CONFIG?.proxyContractConfig?.name;
		} else if (WIRE_UP_CONFIG?.proxyContractConfig?.address) {
			contractNameOrAddress = WIRE_UP_CONFIG?.proxyContractConfig?.address;
		}
	} else {
		if (WIRE_UP_CONFIG?.contractConfig?.name) {
			contractNameOrAddress = WIRE_UP_CONFIG?.contractConfig?.name;
		} else if (WIRE_UP_CONFIG?.chainConfig?.[chain]?.name) {
			contractNameOrAddress = WIRE_UP_CONFIG?.chainConfig?.[chain]?.name;
		} else if (WIRE_UP_CONFIG?.chainConfig?.[chain]?.address) {
			contractNameOrAddress = WIRE_UP_CONFIG?.chainConfig?.[chain]?.address;
		}
	}
	return contractNameOrAddress;
}