import { ActionType } from "hardhat/types"
import { task, types } from "hardhat/config"
import "hardhat-deploy-ethers/internal/type-extensions"
import { ethers } from "ethers"
import { getNetworkRuntimeEnvironment } from "@layerzerolabs/utils-evm-hardhat"

const CONFIG_TYPE_MAX_MESSAGE_SIZE = 1
const CONFIG_TYPE_OUTBOUND_CONFIRMATIONS = 2
const CONFIG_TYPE_EXECUTOR = 3
const CONFIG_TYPE_INBOUND_CONFIRMATIONS = 4
const CONFIG_TYPE_VERIFIERS = 5
const CONFIG_TYPE_OPTIONAL_VERIFIERS = 6
interface TaskArgs {
    networks: string
}
export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs, hre) => {
    // TODO add logging
    // const logger = createLogger()

    const networks = taskArgs.networks.split(",")
    const configByNetwork = await Promise.all(
        networks.map(async (network: string) => {
            const environment = await getNetworkRuntimeEnvironment(network)
            const endpointV2 = await environment.ethers.getContract("EndpointV2")
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
            const inboundConfirmations = ethers.utils.defaultAbiCoder.decode(["uint64"], inboundBlockConfirmationsEncodedData)

            const verifiersEncodedData = await endpointV2.defaultConfig(defaultReceiveLibrary, eid, CONFIG_TYPE_VERIFIERS)
            const verifiers = ethers.utils.defaultAbiCoder.decode(["address[]"], verifiersEncodedData)

            const optionalVerifierEncodedData = await endpointV2.defaultConfig(defaultReceiveLibrary, eid, CONFIG_TYPE_OPTIONAL_VERIFIERS)
            const [optionalVerifiers, optionalVerifierThreshold] = ethers.utils.defaultAbiCoder.decode(
                ["address[]", "uint8"],
                optionalVerifierEncodedData
            )

            const defaultConfig = {
                network,
                defaultSendLibrary,
                defaultReceiveLibrary,
                maxMessageSize: maxMessageSize[0],
                outboundConfirmations: outboundConfirmations[0],
                executor: executor.toString(),
                inboundConfirmations: inboundConfirmations[0],
                verifiers: verifiers[0],
                optionalVerifiers,
                optionalVerifierThreshold,
            }

            const consoleTableDefaultConfig = {
                network,
                defaultSendLibrary,
                defaultReceiveLibrary,
                maxMessageSize: maxMessageSize[0],
                outboundConfirmations: outboundConfirmations[0].toNumber(),
                executor: executor.toString(),
                inboundBlockConfirmations: inboundConfirmations[0].toNumber(),
                verifiers: verifiers[0].toString(),
                optionalVerifiers,
                optionalVerifierThreshold,
            }
            return { defaultConfig, consoleTableDefaultConfig }
        })
    )
    console.log(configByNetwork[0].consoleTableDefaultConfig)
    return configByNetwork[0].defaultConfig
}

task("getDefaultConfig", "outputs the default Send and Receive Messaging Library versions and the default application config")
    .addParam("networks", "comma separated list of networks")
    .setAction(getDefaultConfig)
