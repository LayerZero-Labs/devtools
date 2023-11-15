import { ethers } from "ethers"
import { getProvider, getLayerZeroChainId, getEndpointAddress } from "@/utils/crossChainHelper"
import { ENDPOINT_ABI, MESSAGING_LIBRARY_ABI } from "@/constants/abi"

export default async (taskArgs: any, hre: any) => {
    const networks = taskArgs.networks.split(",")

    const configByNetwork = await Promise.all(
        networks.map(async (network: string) => {
            const provider = getProvider(hre, network)
            console.log()
            const endpoint = new ethers.Contract(getEndpointAddress(network), ENDPOINT_ABI, provider)
            const sendVersion = await endpoint.defaultSendVersion()
            const receiveVersion = await endpoint.defaultReceiveVersion()
            const sendLibraryAddress = await endpoint.defaultSendLibrary()
            const messagingLibrary = new ethers.Contract(sendLibraryAddress, MESSAGING_LIBRARY_ABI, provider)
            const config = await messagingLibrary.defaultAppConfig(getLayerZeroChainId(network))

            return {
                network,
                sendVersion,
                receiveVersion,
                inboundProofLibraryVersion: config.inboundProofLibraryVersion,
                inboundBlockConfirmations: config.inboundBlockConfirmations.toNumber(),
                relayer: config.relayer,
                outboundProofType: config.outboundProofType,
                outboundBlockConfirmations: config.outboundBlockConfirmations.toNumber(),
                oracle: config.oracle,
            }
        })
    )

    console.table(configByNetwork)
}
