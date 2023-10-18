import { Transaction, NetworkTransactions, getContractInstance, getLayerZeroChainId, executeTransactions } from "./utils/crossChainHelper";
import { configExist, getConfig, logError, printTransactions } from "./utils/helpers";
import { setUseCustomAdapterParams, setMinDstGas, setTrustedRemote, getContractNameOrAddress } from "./utils/wireAllHelpers";

export default async function (taskArgs: any, hre: any) {
	if (!configExist(taskArgs.configPath)) {
		logError(`Wire up config file is not found.`);
		return;
	}

	if (taskArgs.n && !configExist(taskArgs.gnosisConfigPath)) {
		logError(`Gnosis config file not found`);
		return;
	}

    const deployer = (await hre.getNamedAccounts()).deployer;
	console.log(`CURRENT SIGNER: ${deployer}`);

    const WIRE_UP_CONFIG = getConfig(taskArgs.configPath);
	const localNetworks = Object.keys(WIRE_UP_CONFIG?.chainConfig)

	console.log(`************************************************`);
	console.log(`Computing diff`);
	console.log(`************************************************`);

	let transactionByNetwork: NetworkTransactions[] = await Promise.all(
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
			if (useCustomAdapterParams !== undefined) {
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
					if (WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.feeBpConfig !== undefined) {
						transactions.push(...(await setFeeBp(hre, localNetwork, localContractNameOrAddress, WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].feeBpConfig, getLayerZeroChainId(remoteNetwork))));
					}

					// setMinDstGas
					if (WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork]?.minDstGasConfig !== undefined) {
						transactions.push(...(await setMinDstGas(hre, localNetwork, localContractNameOrAddress, WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].minDstGasConfig, getLayerZeroChainId(remoteNetwork))));
					}
				})
			);
			return {
				network: localNetwork,
				transactions: transactions,
			};
		})
	) as NetworkTransactions[];

	const noChanges = transactionByNetwork.reduce((acc, { transactions }) => {
		acc += transactions.filter((transaction) => transaction.needChange).length;
		return acc;
	}, 0);
	if (noChanges == 0) {
		//early return
		console.log("No changes needed");
		return;
	}
	const columns = ["needChange", "chainId", "contractName", "functionName", "args", "diff"];
	printTransactions(columns, transactionByNetwork);
    await executeTransactions(hre, taskArgs, transactionByNetwork);
};

async function setDefaultFeeBp(hre: any, localNetwork: string, localContractNameOrAddress: string, defaultFeeBp: number): Promise<Transaction[]> {
	const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
	const cur = await localContract.defaultFeeBp();
	const needChange = cur !== defaultFeeBp;

	// function setDefaultFeeBp(uint16 _feeBp)
	const functionName = "setDefaultFeeBp";
	const params = ["uint16"];
	let args = [defaultFeeBp];

	const tx: any = {
		needChange,
		chainId: getLayerZeroChainId(localNetwork),
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: localContract.interface.encodeFunctionData(functionName, args)
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ defaultFeeBp: { oldValue: cur, newValue: defaultFeeBp } });
	}
	return [tx];
}

async function setFeeBp(hre: any, localNetwork: string, localContractNameOrAddress: string, feeBpConfig: any, remoteChainId: string): Promise<Transaction[]> {
	const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
	const feeConfig = await localContract.chainIdToFeeBps(remoteChainId);
	const curFeeBp = feeConfig[0];
	const curEnabled = feeConfig[1];
	const needChange = curFeeBp !== feeBpConfig.feeBp || curEnabled !== feeBpConfig.enabled;

	// function setFeeBp(uint16 _dstChainId, bool _enabled, uint16 _feeBp)
	const functionName = "setFeeBp";
	const params = ["uint16", "bool", "uint16"];
	const args = [remoteChainId, feeBpConfig.enabled, feeBpConfig.feeBp];
	const calldata = localContract.interface.encodeFunctionData(functionName, args);

	const tx: any = {
		needChange,
		chainId: getLayerZeroChainId(localNetwork),
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: localContract.interface.encodeFunctionData(functionName, args)
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ feeBp: { oldFeeBpValue: curFeeBp, newFeeBpValue: feeBpConfig.feeBp, oldEnabledFee: curEnabled, newEnabledFee: feeBpConfig.enabled } });
	}
	return [tx];
}