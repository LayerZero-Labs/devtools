import {
    createConnectedContractFactory,
    createNetworkEnvironmentFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    type OmniGraphHardhat,
} from '@layerzerolabs/utils-evm-hardhat'
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
import { createSignAndSend } from '@layerzerolabs/utils'

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
    const contractFactory = createConnectedContractFactory()
    const signAndSend = createSignAndSend(createSignerFactory())
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [successful, errors] = await signAndSend(transactions)
    if (errors.length !== 0) {
        throw new Error(`Failed to deploy endpoint: ${errors}`)
    }
}
