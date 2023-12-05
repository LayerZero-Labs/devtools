import {
    createConnectedContractFactory,
    createLogger,
    createNetworkEnvironmentFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    type OmniGraphHardhat,
} from '@layerzerolabs/utils-evm-hardhat'
import deploy from '../../deploy/001_bootstrap'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import {
    configureEndpoint,
    EndpointEdgeConfig,
    EndpointFactory,
    Uln302NodeConfig,
    Uln302ExecutorConfig,
    configureUln302,
    Uln302Factory,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-utils'
import { Endpoint, Uln302 } from '@layerzerolabs/protocol-utils-evm'
import { formatOmniPoint } from '@layerzerolabs/utils'

export const ethEndpoint = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'EndpointV2' }
export const ethReceiveUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'ReceiveUln302' }
export const ethSendUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'SendUln302' }
export const ethExecutor = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'Executor' }
export const ethDvn = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DVN' }
export const avaxEndpoint = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'EndpointV2' }
export const avaxReceiveUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'ReceiveUln302' }
export const avaxSendUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'SendUln302' }
export const avaxExecutor = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'Executor' }
export const avaxDvn = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DVN' }

export const MAX_MESSAGE_SIZE = 10000 // match on-chain value

/**
 * Helper function to generate the default Uln302ExecutorConfig for a given chain.
 *
 * @param executorAddress The local Executor address.
 */
export const getDefaultExecutorConfig = (executorAddress: string): Uln302ExecutorConfig => {
    return {
        maxMessageSize: MAX_MESSAGE_SIZE,
        executor: executorAddress,
    }
}

/**
 * Helper function to generate the default Uln302UlnConfig for a given chain.
 *
 * @param dvnAddress The local DVN address.
 */
export const getDefaultUlnConfig = (dvnAddress: string): Uln302UlnConfig => {
    return {
        confirmations: BigInt(1),
        requiredDVNs: [dvnAddress],
        optionalDVNs: [],
        optionalDVNThreshold: 0,
    }
}

/**
 * Helper function that deploys a fresh endpoint infrastructure:
 *
 * - EndpointV2
 * - ReceiveUln302
 * - SendUln302
 *
 * After deploying, it will wire up the elements with minimal configuration
 */
export const setupDefaultEndpoint = async (): Promise<void> => {
    // This is the tooling we are going to need
    const logger = createLogger()
    const environmentFactory = createNetworkEnvironmentFactory()
    const contractFactory = createConnectedContractFactory()
    const signerFactory = createSignerFactory()
    const endpointSdkFactory: EndpointFactory = async (point) => new Endpoint(await contractFactory(point))
    const ulnSdkFactory: Uln302Factory = async (point) => new Uln302(await contractFactory(point))

    // First we deploy the endpoint
    await deploy(await environmentFactory(EndpointId.ETHEREUM_MAINNET))
    await deploy(await environmentFactory(EndpointId.AVALANCHE_MAINNET))

    // For the graphs, we'll also need the pointers to the contracts
    const ethSendUlnPoint = omniContractToPoint(await contractFactory(ethSendUln))
    const avaxSendUlnPoint = omniContractToPoint(await contractFactory(avaxSendUln))
    const ethReceiveUlnPoint = omniContractToPoint(await contractFactory(ethReceiveUln))
    const avaxReceiveUlnPoint = omniContractToPoint(await contractFactory(avaxReceiveUln))
    const ethExecutorPoint = omniContractToPoint(await contractFactory(ethExecutor))
    const avaxExecutorPoint = omniContractToPoint(await contractFactory(avaxExecutor))
    const ethDvnPoint = omniContractToPoint(await contractFactory(ethDvn))
    const avaxDvnPoint = omniContractToPoint(await contractFactory(avaxDvn))

    const ethUlnConfig: Uln302UlnConfig = getDefaultUlnConfig(ethDvnPoint.address)
    const avaxUlnConfig: Uln302UlnConfig = getDefaultUlnConfig(avaxDvnPoint.address)

    // This is the graph for SendUln302
    const sendUlnConfig: OmniGraphHardhat<Uln302NodeConfig, unknown> = {
        contracts: [
            {
                contract: ethSendUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: avaxSendUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.ETHEREUM_MAINNET, avaxUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.ETHEREUM_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
                    ],
                },
            },
        ],
        connections: [],
    }

    // This is the graph for ReceiveUln302
    const receiveUlnConfig: OmniGraphHardhat<Uln302NodeConfig, unknown> = {
        contracts: [
            {
                contract: ethReceiveUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: avaxReceiveUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.ETHEREUM_MAINNET, avaxUlnConfig]],
                    defaultExecutorConfigs: [],
                },
            },
        ],
        connections: [],
    }

    // This is the graph for EndpointV2
    const config: OmniGraphHardhat<unknown, EndpointEdgeConfig> = {
        contracts: [
            {
                contract: ethEndpoint,
            },
            {
                contract: avaxEndpoint,
            },
        ],
        connections: [
            {
                from: ethEndpoint,
                to: avaxEndpoint,
                config: {
                    defaultReceiveLibrary: ethReceiveUlnPoint.address,
                    defaultSendLibrary: ethSendUlnPoint.address,
                },
            },
            {
                from: avaxEndpoint,
                to: ethEndpoint,
                config: {
                    defaultReceiveLibrary: avaxReceiveUlnPoint.address,
                    defaultSendLibrary: avaxSendUlnPoint.address,
                },
            },
        ],
    }

    // Now we compile a list of all the transactions that need to be executed for the ULNs and Endpoints
    const builderEndpoint = await OmniGraphBuilderHardhat.fromConfig(config)
    const endpointTransactions = await configureEndpoint(builderEndpoint.graph, endpointSdkFactory)
    const builderSendUln = await OmniGraphBuilderHardhat.fromConfig(sendUlnConfig)
    const sendUlnTransactions = await configureUln302(builderSendUln.graph, ulnSdkFactory)
    const builderReceiveUln = await OmniGraphBuilderHardhat.fromConfig(receiveUlnConfig)
    const receiveUlnTransactions = await configureUln302(builderReceiveUln.graph, ulnSdkFactory)

    const transactions = [...sendUlnTransactions, ...receiveUlnTransactions, ...endpointTransactions]

    logger.debug(`Executing ${transactions.length} transactions`)

    for (const transaction of transactions) {
        const signer = await signerFactory(transaction.point.eid)
        const description = transaction.description ?? '[no description]'

        logger.debug(`${formatOmniPoint(transaction.point)}: ${description}`)

        const response = await signer.signAndSend(transaction)
        logger.debug(`${formatOmniPoint(transaction.point)}: ${description}: ${response.transactionHash}`)

        const receipt = await response.wait()
        logger.debug(`${formatOmniPoint(transaction.point)}: ${description}: ${receipt.transactionHash}`)
    }

    logger.debug(`Done configuring endpoint`)
}
