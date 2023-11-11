import { ActionType } from "hardhat/types"
import { task, types } from "hardhat/config"
import { ethers } from "ethers"
import { createGetNetworkEnvironment } from "@layerzerolabs/hardhat-utils"

const CONFIG_TYPE_MAX_MESSAGE_SIZE = 1
const CONFIG_TYPE_OUTBOUND_CONFIRMATIONS = 2
const CONFIG_TYPE_EXECUTOR = 3
const CONFIG_TYPE_INBOUND_CONFIRMATIONS = 4
const CONFIG_TYPE_VERIFIERS = 5
const CONFIG_TYPE_OPTIONAL_VERIFIERS = 6

const action: ActionType<any> = async (taskArgs, hre) => {
    // TODO add logging
    // const logger = createLogger()

    const networks = taskArgs.networks.split(",")
    const getEnvironment = createGetNetworkEnvironment(hre)
    const configByNetwork = await Promise.all(
        networks.map(async (network: string) => {
            const environment = await getEnvironment(network)
            const endpointV2 = await environment.getContract("EndpointV2", environment.provider)
            const eid = await endpointV2.eid()

            const defaultSendLibrary = await endpointV2.defaultSendLibrary(eid)
            const defaultReceiveLibrary = await endpointV2.defaultReceiveLibrary(eid)

            const maxMessageSizeEncodedData = await endpointV2.defaultConfig(defaultSendLibrary, eid, CONFIG_TYPE_MAX_MESSAGE_SIZE)
            const maxMessageSize = ethers.utils.defaultAbiCoder.decode(["uint32"], maxMessageSizeEncodedData)

            const outboundConfirmationsEncodedData = await endpointV2.defaultConfig(defaultSendLibrary, eid, CONFIG_TYPE_OUTBOUND_CONFIRMATIONS)
            const outboundConfirmations = ethers.utils.defaultAbiCoder.decode(["uint64"], outboundConfirmationsEncodedData)

            const executorEncodedData = await endpointV2.defaultConfig(defaultSendLibrary, eid, CONFIG_TYPE_EXECUTOR)
            const executor = ethers.utils.defaultAbiCoder.decode(["address"], executorEncodedData)

            const inboundBlockConfirmationsEncodedData = await endpointV2.defaultConfig(
                defaultReceiveLibrary,
                eid,
                CONFIG_TYPE_INBOUND_CONFIRMATIONS
            )
            const inboundBlockConfirmations = ethers.utils.defaultAbiCoder.decode(["uint64"], inboundBlockConfirmationsEncodedData)

            const verifiersEncodedData = await endpointV2.defaultConfig(defaultReceiveLibrary, eid, CONFIG_TYPE_VERIFIERS)
            const verifiers = ethers.utils.defaultAbiCoder.decode(["address[]"], verifiersEncodedData)

            const optionalVerifierEncodedData = await endpointV2.defaultConfig(defaultReceiveLibrary, eid, CONFIG_TYPE_OPTIONAL_VERIFIERS)
            const [optionalVerifiers, optionalVerifierThreshold] = await ethers.utils.defaultAbiCoder.decode(
                ["uint8", "uint8"],
                optionalVerifierEncodedData
            )

            return {
                network,
                defaultSendLibrary,
                defaultReceiveLibrary,
                maxMessageSize,
                outboundConfirmations,
                executor,
                inboundBlockConfirmations,
                verifiers,
                optionalVerifiers,
                optionalVerifierThreshold,
            }
        })
    )
    console.table(configByNetwork)
}

task("getDefaultConfig", "outputs the default Send and Receive Messaging Library versions and the default application config")
    .addParam("networks", "comma separated list of networks")
    .setAction(action)
