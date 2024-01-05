import { Address } from '@layerzerolabs/devtools'
import { Timeout, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import {
    createConnectedContractFactory,
    getEidForNetworkName,
    OmniGraphBuilderHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createConfigLoader, printJson } from '@layerzerolabs/io-devtools'
import { createEndpointFactory } from '@layerzerolabs/protocol-devtools-evm'
import { OAppOmniGraphHardhat, OAppOmniGraphHardhatSchema } from '@/oapp'
import { resolve } from 'path'

import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { Logger } from '@layerzerolabs/io-devtools'

export async function getSendConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig, Uln302ExecutorConfig] | undefined> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const endpointFactory = createEndpointFactory(contractFactory)

    const localEndpointSDK = await endpointFactory({ eid: localEid, contractName: 'EndpointV2' })

    // First we get the SDK for the local send library
    const sendLibrary =
        address == null
            ? await localEndpointSDK.getDefaultSendLibrary(remoteEid)
            : await localEndpointSDK.getSendLibrary(address, remoteEid)

    if (sendLibrary == null) return undefined

    const localSendUlnSDK = await localEndpointSDK.getUln302SDK(sendLibrary)
    const sendUlnConfig = await localSendUlnSDK.getUlnConfig(remoteEid)
    const sendExecutorConfig = await localSendUlnSDK.getExecutorConfig(remoteEid)

    return [sendLibrary, sendUlnConfig, sendExecutorConfig]
}

export async function getReceiveConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig, Timeout] | undefined> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const endpointFactory = createEndpointFactory(contractFactory)

    const localEndpointSDK = await endpointFactory({ eid: localEid, contractName: 'EndpointV2' })

    // First we get the SDK for the local send library
    const receiveLibrary =
        address == null
            ? await localEndpointSDK.getDefaultReceiveLibrary(remoteEid)
            : await localEndpointSDK.getReceiveLibrary(address, remoteEid).then(([address]) => address)

    if (receiveLibrary == null) return undefined

    let receiveLibraryTimeout: Timeout
    if (address) {
        receiveLibraryTimeout = await localEndpointSDK.getReceiveLibraryTimeout(address, remoteEid)
    } else {
        receiveLibraryTimeout = await localEndpointSDK.getDefaultReceiveLibraryTimeout(remoteEid)
    }

    const localReceiveUlnSDK = await localEndpointSDK.getUln302SDK(receiveLibrary)

    const receiveUlnConfig = await localReceiveUlnSDK.getUlnConfig(remoteEid)
    return [receiveLibrary, receiveUlnConfig, receiveLibraryTimeout]
}

export async function validateAndTransformOappConfig(oappConfigPath: string, logger: Logger): Promise<OAppOmniGraph> {
    // Now we create our config loader
    const configLoader = createConfigLoader<OAppOmniGraphHardhat>(OAppOmniGraphHardhatSchema)

    // At this point we have a correctly typed config in the hardhat format
    const hardhatGraph: OAppOmniGraphHardhat = await configLoader(resolve(oappConfigPath))

    // We'll also print out the whole config for verbose loggers
    logger.verbose(`Config file '${oappConfigPath}' has correct structure`)
    logger.debug(`The hardhat config is:\n\n${printJson(hardhatGraph)}`)

    // What we need to do now is transform the config from hardhat format to the generic format
    // with addresses instead of contractNames
    logger.verbose(`Transforming '${oappConfigPath}' from hardhat-specific format to generic format`)
    let graph: OAppOmniGraph
    try {
        // The transformation is achieved using a builder that also validates the resulting graph
        // (i.e. makes sure that all the contracts exist and connections are valid)
        const builder = await OmniGraphBuilderHardhat.fromConfig(hardhatGraph)

        // We only need the graph so we throw away the builder
        graph = builder.graph
    } catch (error) {
        throw new Error(`Config from file '${oappConfigPath}' is invalid: ${error}`)
    }

    // Show more detailed logs to interested users
    logger.verbose(`Transformed '${oappConfigPath}' from hardhat-specific format to generic format`)
    logger.debug(`The resulting config is:\n\n${printJson(graph)}`)

    return graph
}
