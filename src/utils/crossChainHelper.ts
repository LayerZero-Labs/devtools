import * as ethers from "ethers";
import { Contract, ContractReceipt } from "ethers";
import { createProvider } from "hardhat/internal/core/providers/construction";
import { DeploymentsManager } from "hardhat-deploy/dist/src/DeploymentsManager";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import Safe from "@gnosis.pm/safe-core-sdk";
import { CHAIN_ID } from "@layerzerolabs/lz-sdk";
const path = require("path");
const fs = require("fs");

export interface ExecutableTransaction {
	contractName: string;
	functionName: string;
	args: any[];
	txArgs?: any;
}

export interface Transaction {
	needChange: boolean;
	chainId: string;
	remoteChainId?: string;
	contractAddress: string;
	functionName: string;
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
export const getProvider = (hre: any, network: string) => {
	if (!providerByNetwork[network]) {
		const networkUrl = hre.config.networks[network].url;
		providerByNetwork[network] = new ethers.providers.JsonRpcProvider(networkUrl);
	}
	return providerByNetwork[network];
}

export const getWallet = (index: number) => ethers.Wallet.fromMnemonic(process.env.MNEMONIC || "", `m/44'/60'/0'/0/${index}`)

const connectedWallets: { [key: string]: any } = {};
export const getConnectedWallet = (hre: any, network: string, walletIndex: number) => {
	const key = `${network}-${walletIndex}`;
	if (!connectedWallets[key]) {
		const provider = getProvider(hre, network);
		const wallet = getWallet(walletIndex);
		connectedWallets[key] = wallet.connect(provider);
	}
	return connectedWallets[key];
};

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
		const provider = getProvider(hre, network);
		const contractFactory = await getContractFactory(hre, contractName);
		const contract = contractFactory.attach(contractAddress);
		contracts[key] = contract.connect(provider);
	}
	return contracts[key];
}

export const getContractAt = async (hre: any, network: string, abi: any, contractAddress: string) => {
	const key = `${network}-${contractAddress}`;
	if (!contracts[key]) {
		const provider = getProvider(hre, network);
		const contract = new Contract(contractAddress, abi, provider);
		contracts[key] = contract.connect(provider);
	}
	return contracts[key];
}

export const getWalletContract = async (hre: any, network: string, contractName: string, walletIndex: number = 0) => {
	const contract = await getContract(hre, network, contractName);
	const wallet = getConnectedWallet(hre, network, walletIndex);
	return contract.connect(wallet);
}

export const getWalletContractAt = async (hre: any, network: string, abi: any, contractAddress: string, walletIndex = 0) => {
	const contract = await getContractAt(hre, network, abi, contractAddress);
	const wallet = getConnectedWallet(hre, network, walletIndex);
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
	const gasPrice = await getProvider(hre, network).getGasPrice();
	const finalGasPrice = gasPrice.mul(10).div(8);

	return await (
		await walletContract[transaction.functionName](...transaction.args, {
			gasPrice: finalGasPrice,
			gasLimit: 200000,
			...transaction.txArgs,
		})
	).wait()
}

export const executeGnosisTransactions = async (hre: any, network: string, gnosisConfig: any, transactions: Transaction[]) => {
	const signer = await getConnectedWallet(hre, network, 0);
	if (!gnosisConfig[network]) {
		throw Error(`Gnosis for ${network} not found or not supported`);
	}

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
	});
}

export const getDeploymentAddresses = (network: string, throwIfMissing: boolean = true): any => {
	const deploymentAddresses: { [key: string]: any } = {};
	const DEPLOYMENT_PATH = path.resolve("deployments");

	if (!fs.existsSync(DEPLOYMENT_PATH)) {
		return deploymentAddresses;
	}

	let folderName = network;
	if (network === "hardhat") {
		folderName = "localhost";
	}

	const networkFolderName = fs.readdirSync(DEPLOYMENT_PATH).filter((f:string) => f === folderName)[0];
	if (networkFolderName === undefined) {
		if(throwIfMissing) {
			throw new Error("missing deployment files for endpoint " + folderName);
		}
		return deploymentAddresses;		
	}

	const networkFolderPath = path.resolve(DEPLOYMENT_PATH, folderName);
	const files = fs.readdirSync(networkFolderPath).filter((f: string) => f.includes(".json"));
	files.forEach((file: string) => {
		const filepath = path.resolve(networkFolderPath, file);
		const data = JSON.parse(fs.readFileSync(filepath));
		const contractName = file.split(".")[0];
		deploymentAddresses[contractName] = data.address;
	});

	return deploymentAddresses;
}

export const getApplicationConfig = async (remoteNetwork: string, sendLibrary: any, receiveLibrary: any, applicationAddress: string) => {
	const remoteChainId = CHAIN_ID[remoteNetwork];

	const sendConfig = await sendLibrary.appConfig(applicationAddress, remoteChainId);
	let inboundProofLibraryVersion = sendConfig.inboundProofLibraryVersion;
	let inboundBlockConfirmations = sendConfig.inboundBlockConfirmations.toNumber();

	if (receiveLibrary) {
		const receiveConfig = await receiveLibrary.appConfig(applicationAddress, remoteChainId);
		inboundProofLibraryVersion = receiveConfig.inboundProofLibraryVersion;
		inboundBlockConfirmations = receiveConfig.inboundBlockConfirmations.toNumber();
	}
	return {
		remoteNetwork,
		inboundProofLibraryVersion,
		inboundBlockConfirmations,
		relayer: sendConfig.relayer,
		outboundProofType: sendConfig.outboundProofType,
		outboundBlockConfirmations: sendConfig.outboundBlockConfirmations.toNumber(),
		oracle: sendConfig.oracle,
	};
};