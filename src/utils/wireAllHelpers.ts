import { Transaction, executeGnosisTransactions, executeTransaction, getContractAt, getContract, getLayerZeroChainId } from "./crossChainHelper";
import { promptToProceed, logError, arrayToCsv, configExist, getConfig } from "./helpers";
import { writeFile } from "fs/promises";
import { LZ_APP_ABI } from "../constants/abi";

export async function setUseCustomAdapterParams(hre: any, localNetwork: string, localContractNameOrAddress: string, useCustom: boolean): Promise<Transaction[]> {
	const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
	const cur = await localContract.useCustomAdapterParams();
	const needChange = cur !== useCustom;

	// function setUseCustomAdapterParams(bool _useCustomAdapterParams)
	const functionName = "setUseCustomAdapterParams";
	const params = ["bool"];
	let args = [useCustom];

	const tx: any = {
		needChange,
		chainId: getLayerZeroChainId(localNetwork),
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
		calldata: localContract.interface.encodeFunctionData(functionName, args)
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ useCustomAdapterParams: { oldValue: cur, newValue: useCustom } });
	}
	return [tx];
}

export async function setMinDstGas(hre: any, localNetwork: string, localContractNameOrAddress: string, minDstGasConfig: any, remoteChainId: number): Promise<Transaction[]> {
	const txns: Transaction[] = [];
	const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
    const packetTypes = Object.keys(minDstGasConfig);
    for(const packet of packetTypes) {
		let packetType = parseInt(packet.at(-1));
		const minGas = minDstGasConfig[packet];
		const cur = (await localContract.minDstGasLookup(remoteChainId, packetType)).toNumber();
		const needChange = cur !== minGas;

		// function setMinDstGas(uint16 _dstChainId, uint16 _packetType, uint _minGas)
		const functionName = "setMinDstGas";
		const params = ["uint16", "uint16", "uint256"];
		let args = [remoteChainId, packetType, minGas];

		const tx: any = {
			needChange,
			chainId: getLayerZeroChainId(localNetwork),
			contractName: localContractNameOrAddress,
			functionName,
			args: args,
		    calldata: localContract.interface.encodeFunctionData(functionName, args)
		};
		if (tx.needChange) {
			tx.diff = JSON.stringify({ oldValue: cur, newValue: minGas });
		}
		txns.push(tx);
    }
	return txns;
}

export async function setTrustedRemote(hre: any, localNetwork: string, localContractNameOrAddress: string, remoteNetwork: string, remoteContractNameOrAddress: string): Promise<Transaction[]> {
	const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
	const remoteContract = await getContractInstance(hre, remoteNetwork, remoteContractNameOrAddress)

	const remoteContractAddress = await remoteContract.address;
	const desiredTrustedRemote = hre.ethers.utils.solidityPack(["bytes"], [remoteContractAddress + localContract.address.substring(2)]);

	const remoteChainId = getLayerZeroChainId(remoteNetwork);
	const cur = await localContract.trustedRemoteLookup(remoteChainId);
	const needChange = cur != desiredTrustedRemote;

	// function setTrustedRemote(uint16 _srcChainId, bytes calldata _path)
	const functionName = "setTrustedRemote";
	const params = ["uint16", "bytes"];
	let args = [remoteChainId, desiredTrustedRemote];

	const tx: any = {
		needChange,
		chainId: getLayerZeroChainId(localNetwork),
		contractName: localContractNameOrAddress,
		functionName: functionName,
		args: args,
        calldata: localContract.interface.encodeFunctionData(functionName, args)
	};
	if (tx.needChange) {
		tx.diff = JSON.stringify({ trustedRemote: { oldValue: cur, newValue: desiredTrustedRemote } });
	}
	return [tx];
}

export function getContractNameOrAddress(chain: string, WIRE_UP_CONFIG: any) {
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

export async function executeTransactions(hre: any, taskArgs: any, transactionBynetwork: any) {
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
        const gnosisConfig = getConfig(taskArgs.gnosisConfigPath);
		await Promise.all(
			transactionBynetwork.map(async ({ network, transactions }) => {
				const transactionToCommit = transactions.filter((transaction) => transaction.needChange);
				print[network] = print[network] || { requests: `1/1` };
				print[network].current = `executeGnosisTransactions: ${transactionToCommit}`;
				try {
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
					    const gasLimit = taskArgs.gasLimit;
						const tx = await executeTransaction(hre, network, transaction, gasLimit);
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
}
