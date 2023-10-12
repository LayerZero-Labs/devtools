import { Transaction, executeGnosisTransactions, executeTransaction, getContractAt, getContract, getChainId } from "./utils/crossChainHelper";
import { promptToProceed, logError } from "./utils/helpers";
import { configExist, getConfig } from "./utils/fileConfigHelper";
import { CHAIN_STAGE, ChainKey, ChainStage } from "@layerzerolabs/lz-sdk";
import { arrayToCsv } from "./utils/helpers";
import { writeFile } from "fs/promises";
import { LzAppAbi, generateCalldata, setUseCustomAdapterParams, setMinDstGas, setTrustedRemote, getContractNameOrAddress, executeTransactions } from "./utils/wireAllHelpers";

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
			const useCustomAdapterParams = WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.useCustomAdapterParams;
			if (useCustomAdapterParams) {
				transactions.push(...(await setUseCustomAdapterParams(hre, localNetwork, localContractNameOrAddress, useCustomAdapterParams)));
			}

			// check if defaultFeeBp needs to be set
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
					transactions.push(...(await setTrustedRemote(hre, localNetwork, localContractNameOrAddress, remoteNetwork, remoteContractNameOrAddress)));

					// setFeeBp
					if (WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.feeBpConfig) {
						transactions.push(...(await setFeeBp(hre, localNetwork, localContractNameOrAddress, WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].feeBpConfig, getChainId(remoteNetwork, env))));
					}

					// setMinDstGas
					if (WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.minDstGasConfig) {
						transactions.push(...(await setMinDstGas(hre, localNetwork, localContractNameOrAddress, WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].minDstGasConfig, getChainId(remoteNetwork, env))));
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

    await executeTransactions(hre, taskArgs, transactionBynetwork);
};

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

	const [chain, env] = localNetwork.split("-")
	const tx: any = {
		needChange,
		chainId: getChainId(chain, env),
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

	const [chain, env] = localNetwork.split("-")
	const tx: any = {
		needChange,
		chainId: getChainId(chain, env),
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