import { getDeploymentAddresses, getApplicationConfig } from "./utils/crossChainHelper";
import { logError } from "./utils/helpers";
const { LZ_ADDRESS } = require("@layerzerolabs/lz-sdk");
const { ENDPOINT_ABI, MESSAGING_LIBRARY_ABI } = require("./constants/abi"); 

module.exports = async (taskArgs: any, hre: any) => {
	const network = hre.network.name;
	const remoteNetworks = taskArgs.remoteNetworks.split(",");
	const contractName = taskArgs.name;
	let contractAddress = taskArgs.address;

	if (!contractName && !contractAddress) {
		logError("Provide contract name or address");
		return;
	}	

	if (contractName && !contractAddress) {
		contractAddress = getDeploymentAddresses(network, false)[contractName];
		if (!contractAddress) {
			logError(`Deployment information isn't found for ${contractName}`);
			return;
		}
	}	

	const endpoint = await hre.ethers.getContractAt(ENDPOINT_ABI, LZ_ADDRESS[network]);
	const appConfig = await endpoint.uaConfigLookup(contractAddress);
	const sendVersion = appConfig.sendVersion;
	const receiveVersion = appConfig.receiveVersion;	
	const sendLibraryAddress = sendVersion === 0 ? await endpoint.defaultSendLibrary() : appConfig.sendLibrary;
	const sendLibrary = await hre.ethers.getContractAt(MESSAGING_LIBRARY_ABI, sendLibraryAddress);	
	let receiveLibrary: any;

	if (sendVersion !== receiveVersion){
		const receiveLibraryAddress = receiveVersion === 0 ? await endpoint.defaultReceiveLibraryAddress() : appConfig.receiveLibraryAddress;
		receiveLibrary = await hre.ethers.getContractAt(MESSAGING_LIBRARY_ABI, receiveLibraryAddress);
	}
		
	const remoteConfig: any[] = await Promise.all(
		remoteNetworks.map(async (remoteNetwork: string) => {
			if (network === remoteNetwork) return;
			return await getApplicationConfig(remoteNetwork, sendLibrary, receiveLibrary, contractAddress);
		})
	)

	console.log("Network            ", network);
	console.log("Application address", contractAddress);
	console.log("Send version       ", sendVersion);
	console.log("Receive version    ", receiveVersion);
	console.table(remoteConfig);
}