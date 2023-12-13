import {
    createConnectedContractFactory,
    createNetworkEnvironmentFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    type OmniGraphHardhat,
} from '@layerzerolabs/utils-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-utils'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import {
    configureEndpoint,
    EndpointEdgeConfig,
    Uln302NodeConfig,
    Uln302ExecutorConfig,
    configureUln302,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-utils'
import { createEndpointFactory, createUln302Factory } from '@layerzerolabs/protocol-utils-evm'
import { formatOmniPoint } from '@layerzerolabs/utils'

export const ethEndpoint = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'EndpointV2' }
export const ethReceiveUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'ReceiveUln302' }
export const ethSendUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'SendUln302' }
export const ethReceiveUln2_Opt2 = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const ethSendUln2_Opt2 = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'SendUln302_Opt2' }
export const ethExecutor = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'Executor' }
export const ethDvn = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DVN' }
export const avaxEndpoint = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'EndpointV2' }
export const avaxReceiveUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'ReceiveUln302' }
export const avaxSendUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'SendUln302' }
export const avaxReceiveUln2_Opt2 = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const avaxSendUln2_Opt2 = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'SendUln302_Opt2' }
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
 * Deploys an enpoint fixture. Useful for tests
 */
export const deployEndpointFixture = async () => {
    const environmentFactory = createNetworkEnvironmentFactory()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([eth.deployments.fixture('EndpointV2'), avax.deployments.fixture('EndpointV2')])
}

/**
 * Deploys an enpoint fixture. Useful for when deployment files need to be persisted
 */
export const deployEndpoint = async () => {
    const environmentFactory = createNetworkEnvironmentFactory()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([
        eth.deployments.run('EndpointV2', { writeDeploymentsToFiles: true }),
        avax.deployments.run('EndpointV2', { writeDeploymentsToFiles: true }),
    ])
}

/**
 * Helper function that wires the endpoint infrastructure.
 *
 * The contracts still need to be deployed (use deployEndpoint or deployEndpointFixture)
 */
export const setupDefaultEndpoint = async (): Promise<void> => {
    // This is the tooling we are going to need
    const logger = createLogger()
    const contractFactory = createConnectedContractFactory()
    const signerFactory = createSignerFactory()
    const ulnSdkFactory = createUln302Factory(contractFactory)
    const endpointSdkFactory = createEndpointFactory(contractFactory, ulnSdkFactory)

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

    const sendUlnConfig_Opt2: OmniGraphHardhat<Uln302NodeConfig, unknown> = {
        contracts: [
            {
                contract: ethSendUln2_Opt2,
                config: {
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: avaxSendUln2_Opt2,
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
    const receiveUlnConfig_Opt2: OmniGraphHardhat<Uln302NodeConfig, unknown> = {
        contracts: [
            {
                contract: ethReceiveUln2_Opt2,
                config: {
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: avaxReceiveUln2_Opt2,
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

    const builderSendUln_Opt2 = await OmniGraphBuilderHardhat.fromConfig(sendUlnConfig_Opt2)
    const sendUlnTransactions_Opt2 = await configureUln302(builderSendUln_Opt2.graph, ulnSdkFactory)

    const builderReceiveUln_Opt2 = await OmniGraphBuilderHardhat.fromConfig(receiveUlnConfig_Opt2)
    const receiveUlnTransactions_Opt2 = await configureUln302(builderReceiveUln_Opt2.graph, ulnSdkFactory)

    const transactions = [
        ...sendUlnTransactions,
        ...receiveUlnTransactions,
        ...endpointTransactions,
        ...sendUlnTransactions_Opt2,
        ...receiveUlnTransactions_Opt2,
    ]

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
