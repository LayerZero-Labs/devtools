import hre from "hardhat"
import { GetByNetwork, createGetNetworkEnvironment } from "@layerzerolabs/hardhat-utils"
import { defaultAbiCoder } from "@ethersproject/abi"

const CONFIG_TYPE_MAX_MESSAGE_SIZE = 1
const CONFIG_TYPE_OUTBOUND_CONFIRMATIONS = 2
const CONFIG_TYPE_EXECUTOR = 3
const CONFIG_TYPE_INBOUND_CONFIRMATIONS = 4
const CONFIG_TYPE_VERIFIERS = 5
const CONFIG_TYPE_OPTIONAL_VERIFIERS = 6

// TODO Add explicit return type
export type GetDefaultConfig = GetByNetwork<unknown>

export const createGetDefaultConfig =
    (getEnvironment = createGetNetworkEnvironment(hre)): GetDefaultConfig =>
    async (network: string) => {
        const environment = await getEnvironment(network)
        const endpointV2 = await environment.getContract("EndpointV2", environment.provider)
        const eid = await endpointV2.eid()

        const defaultSendLibrary = await endpointV2.defaultSendLibrary(eid)
        const defaultReceiveLibrary = await endpointV2.defaultReceiveLibrary(eid)

        const maxMessageSizeEncodedData = await endpointV2.defaultConfig(defaultSendLibrary, eid, CONFIG_TYPE_MAX_MESSAGE_SIZE)
        const maxMessageSize = defaultAbiCoder.decode(["uint32"], maxMessageSizeEncodedData)

        const outboundConfirmationsEncodedData = await endpointV2.defaultConfig(defaultSendLibrary, eid, CONFIG_TYPE_OUTBOUND_CONFIRMATIONS)
        const outboundConfirmations = defaultAbiCoder.decode(["uint64"], outboundConfirmationsEncodedData)

        const executorEncodedData = await endpointV2.defaultConfig(defaultSendLibrary, eid, CONFIG_TYPE_EXECUTOR)
        const executor = defaultAbiCoder.decode(["address"], executorEncodedData)

        const inboundBlockConfirmationsEncodedData = await endpointV2.defaultConfig(
            defaultReceiveLibrary,
            eid,
            CONFIG_TYPE_INBOUND_CONFIRMATIONS
        )
        const inboundBlockConfirmations = defaultAbiCoder.decode(["uint64"], inboundBlockConfirmationsEncodedData)

        const verifiersEncodedData = await endpointV2.defaultConfig(defaultReceiveLibrary, eid, CONFIG_TYPE_VERIFIERS)
        const verifiers = defaultAbiCoder.decode(["address[]"], verifiersEncodedData)

        const optionalVerifierEncodedData = await endpointV2.defaultConfig(defaultReceiveLibrary, eid, CONFIG_TYPE_OPTIONAL_VERIFIERS)
        const [optionalVerifiers, optionalVerifierThreshold] = defaultAbiCoder.decode(["uint8", "uint8"], optionalVerifierEncodedData)

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
    }
