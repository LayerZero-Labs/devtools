import { ethers } from "ethers";
import { getProvider } from "./utils/crossChainHelper";
const { LZ_ADDRESS, CHAIN_ID } = require("@layerzerolabs/lz-sdk");
const { ENDPOINT_ABI, MESSAGING_LIBRARY_ABI } = require("./constants/abi") 

module.exports = async (taskArgs: any, hre: any) => {
	const networks = taskArgs.networks.split(",");

	const configByNetwork =  await Promise.all(
		networks.map(async (network: string) => {
			const provider = getProvider(hre, network)
			const endpoint = new ethers.Contract(LZ_ADDRESS[network], ENDPOINT_ABI, provider);
			const sendVersion = await endpoint.defaultSendVersion();
			const receiveVersion = await endpoint.defaultReceiveVersion();
			const sendLibraryAddress = await endpoint.defaultSendLibrary();
			const messagingLibrary = new ethers.Contract(sendLibraryAddress, MESSAGING_LIBRARY_ABI, provider);
			const config = await messagingLibrary.defaultAppConfig(CHAIN_ID[network]);
	
			return {
				network,
				sendVersion,
				receiveVersion,
				inboundProofLibraryVersion: config[0],
				inboundBlockConfirmations: config[1].toNumber(),
				relayer: config[2],
				outboundProofType: config[3],
				outboundBlockConfirmations: config[4].toNumber(),
				oracle: config[5]
			};
		})
	)
	
	console.table(configByNetwork);
}