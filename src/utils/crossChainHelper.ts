import * as ethers from "ethers";
import { ContractReceipt } from "ethers";
import { createProvider } from "hardhat/internal/core/providers/construction";
import { DeploymentsManager } from "hardhat-deploy/dist/src/DeploymentsManager";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import Safe from "@gnosis.pm/safe-core-sdk";
import * as dotenv from "dotenv";
const path = require("path");
const fs = require("fs");

dotenv.config({ path: __dirname + "/.env" });

export interface ExecutableTransaction {
	contractName: string;
	methodName: string;
	args: any[];
	txArgs?: any;
}

export interface Transaction {
	needChange: boolean;
	chainId: string;
	remoteChainId?: string;
	contractAddress: string;
	methodName: string;
	args: any[];
	calldata?: string;
	diff?: { [key: string]: { newValue: any; oldValue: any } };
}

export interface NetworkTransactions {
	network: string;
	transactions: Transaction[];
}

const getDeploymentManager = (hre: any, networkName: string): any => {
	const network: any = {
		name: networkName,
		config: hre.config.networks[networkName],
		provider: createProvider(networkName, hre.config.networks[networkName], hre.config.paths, hre.artifacts),
		saveDeployments: true,
	};
	const newHre = Object.assign(Object.create(Object.getPrototypeOf(hre)), hre);
	newHre.network = network;
	const deploymentsManager = new DeploymentsManager(newHre, network);
	newHre.deployments = deploymentsManager.deploymentsExtension;
	newHre.getNamedAccounts = deploymentsManager.getNamedAccounts.bind(deploymentsManager);
	newHre.getUnnamedAccounts = deploymentsManager.getUnnamedAccounts.bind(deploymentsManager);
	newHre.getChainId = () => deploymentsManager.getChainId();
	return deploymentsManager;
};

export const deployContract = async (hre: any, network: string, tags: string[]) => {
	const deploymentsManager = getDeploymentManager(hre, network);
	await deploymentsManager.runDeploy(tags, {
		log: false, //args.log,
		resetMemory: false,
		writeDeploymentsToFiles: true,
		savePendingTx: false,
	});
}

const providerByNetwork: { [name: string]: ethers.providers.JsonRpcProvider } = {};
export const getProvider = (network: string) => {
	if (!providerByNetwork[network]) {
		const networkUrl = getRpc(network);
		providerByNetwork[network] = new ethers.providers.JsonRpcProvider(networkUrl);
	}
	return providerByNetwork[network];
}

export const getWallet = (index: number) => ethers.Wallet.fromMnemonic(process.env.MNEMONIC || "", `m/44'/60'/0'/0/${index}`)

const connectedWallets: { [key: string]: any } = {};
export const getConnectedWallet = (network: string, walletIndex: number) => {
	const key = `${network}-${walletIndex}`;
	if (!connectedWallets[key]) {
		const provider = getProvider(network);
		const wallet = getWallet(walletIndex);
		connectedWallets[key] = wallet.connect(provider);
	}
	return connectedWallets[key];
}

const deploymentAddresses: { [key: string]: string } = {};
export const getDeploymentAddress = (network: string, contractName: string) => {
	const key = `${network}-${contractName}`;
	if (!deploymentAddresses[key]) {
		deploymentAddresses[key] =  getDeploymentAddresses(network)[contractName];
	}
	if (!deploymentAddresses[key]) {
		throw Error(`contract ${key} not found for network: ${network}`);
	}
	return deploymentAddresses[key];
}

const contracts: { [key: string]: any } = {};
export const getContract = async (hre: any, network: string, contractName: string) => {
	if (network == "hardhat") {
		return await hre.ethers.getContract(contractName);
	}

	const key = `${network}-${contractName}`;
	if (!contracts[key]) {
		const contractAddress = getDeploymentAddress(network, contractName);
		const provider = getProvider(network);
		const contractFactory = await getContractFactory(hre, contractName);
		const contract = contractFactory.attach(contractAddress);
		contracts[key] = contract.connect(provider);
	}
	return contracts[key];
}

export const getContractAt = async (hre: any, network: string, contractName: string, abi: any, contractAddress: string) => {
	const key = `${network}-${contractName}`;
	if (!contracts[key]) {
		const deployedContractAddress = getDeploymentAddress(network, contractName);
		const contract = deployedContractAddress 
			? (await getContractFactory(hre, contractName)).attach(deployedContractAddress) 
			: await hre.ethers.getContractAt(abi, contractAddress);
		const provider = getProvider(network);
		contracts[key] = contract.connect(provider);
	}
	return contracts[key];
}

export const getWalletContract = async (hre: any, network: string, contractName: string, walletIndex: number = 0) => {
	const contract = await getContract(hre, network, contractName);
	const wallet = getConnectedWallet(network, walletIndex);
	return contract.connect(wallet);
}

export const getWalletContractAt = async (hre: any, network: string, contractName: string, abi: any, contractAddress: string, walletIndex = 0) => {
	const contract = await getContractAt(hre, network, contractName, abi, contractAddress);
	const wallet = getConnectedWallet(network, walletIndex);
	return contract.connect(wallet);
};

const contractFactories: { [name: string]: ethers.ContractFactory } = {};
const getContractFactory = async (hre: any, contractName: string) => {
	if (!contractFactories[contractName]) {
		contractFactories[contractName] = await hre.ethers.getContractFactory(contractName);
	}
	return contractFactories[contractName];
}

export const executeTransaction = async (hre: any, network: string, transaction: ExecutableTransaction, contract?: any): Promise<ContractReceipt> => {
	const walletContract = contract ? contract : await getWalletContract(hre, network, transaction.contractName, 0);
	const gasPrice = await getProvider(network).getGasPrice();
	const finalGasPrice = gasPrice.mul(10).div(8);

	return await (
		await walletContract[transaction.methodName](...transaction.args, {
			gasPrice: finalGasPrice,
			gasLimit: 8000000,
			...transaction.txArgs,
		})
	).wait()
}

export const executeGnosisTransactions = async (hre: any, network: string, gnosisConfig: any, transactions: Transaction[]) => {
	const signer = await getConnectedWallet(network, 0);
	//invariant(GNOSIS_CONFIG[network], `Gnosis for ${network} not supported.`)
	const { safeAddress, url } = gnosisConfig[network];
	console.log(`safeAddress[${safeAddress}] url[${url}]`);

	const safeService = new SafeServiceClient(url);
	const ethAdapter = new EthersAdapter({
		ethers: hre.ethers,
		signerOrProvider: signer,
	});

	const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });
	const gnosisTransactions = transactions.map((tx) => ({ to: tx.contractAddress, data: tx.calldata!, value: "0" }));
	const nonce = await safeService.getNextNonce(safeAddress);
	const safeTransaction = await safeSdk.createTransaction(gnosisTransactions, { nonce });

	await safeSdk.signTransaction(safeTransaction);
	const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
	await safeService.proposeTransaction({
		safeAddress,
		safeTransaction,
		safeTxHash,
		senderAddress: signer.address,
	})
}

export const getDeploymentAddresses = (network: string): any => {
	const PROJECT_ROOT = path.resolve(__dirname, "..");
	const DEPLOYMENT_PATH = path.resolve(PROJECT_ROOT, "deployments");

	let folderName = network;
	if (network === "hardhat") {
		folderName = "localhost";
	}

	const networkFolderName = fs.readdirSync(DEPLOYMENT_PATH).filter((f:string) => f === folderName)[0];
	if (networkFolderName === undefined) {
		throw new Error("missing deployment files for endpoint " + folderName);
	}

	let rtnAddresses: { [key: string]: any } = {};
	const networkFolderPath = path.resolve(DEPLOYMENT_PATH, folderName);
	const files = fs.readdirSync(networkFolderPath).filter((f: string) => f.includes(".json"));
	files.forEach((file: string) => {
		const filepath = path.resolve(networkFolderPath, file);
		const data = JSON.parse(fs.readFileSync(filepath));
		const contractName = file.split(".")[0];
		rtnAddresses[contractName] = data.address;
	});

	return rtnAddresses;
}

export const getRpc = (network: string) => {
	try {
		return require("../hardhat.config").default.networks[network].url;
	} catch (e) {
		throw `getRpc failed to get RPC URL for >> ${network} << -- do you REALLY have this network configured properly in hardhat.config.ts??`;
	}
}
