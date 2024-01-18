import {
    createConnectedContractFactory,
    createErrorParser,
    createGetHreByEid,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    type OmniGraphHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import {
    configureEndpoint,
    EndpointEdgeConfig,
    Uln302NodeConfig,
    Uln302ExecutorConfig,
    configureUln302,
    Uln302UlnConfig,
    configurePriceFeed,
    PriceFeedEdgeConfig,
    PriceData,
    ExecutorEdgeConfig,
    ExecutorDstConfig,
    configureExecutor,
} from '@layerzerolabs/protocol-devtools'
import {
    createEndpointFactory,
    createExecutorFactory,
    createPriceFeedFactory,
    createUln302Factory,
} from '@layerzerolabs/protocol-devtools-evm'
import { createSignAndSend } from '@layerzerolabs/devtools'

export const ethEndpoint = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'EndpointV2' }
export const ethReceiveUln = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'ReceiveUln302' }
export const ethSendUln = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'SendUln302' }
export const ethPriceFeed = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'PriceFeed' }
export const ethReceiveUln2_Opt2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const ethSendUln2_Opt2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'SendUln302_Opt2' }
export const ethExecutor = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'Executor' }
export const ethDvn = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DVN' }
export const avaxEndpoint = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'EndpointV2' }
export const avaxReceiveUln = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'ReceiveUln302' }
export const avaxSendUln = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'SendUln302' }
export const avaxPriceFeed = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'PriceFeed' }
export const avaxReceiveUln2_Opt2 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const avaxSendUln2_Opt2 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'SendUln302_Opt2' }
export const avaxExecutor = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'Executor' }
export const avaxDvn = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DVN' }

export const MAX_MESSAGE_SIZE = 10000 // match on-chain value

const defaultPriceData: PriceData = {
    priceRatio: '100000000000000000000',
    gasPriceInUnit: 1,
    gasPerByte: 1,
}

const defaultExecutorDstConfig: ExecutorDstConfig = {
    baseGas: BigInt(200_000),
    multiplierBps: BigInt(0),
    floorMarginUSD: BigInt(0),
    nativeCap: BigInt(250_000_000_000_000_000), // 0.25 ether
}

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
 * Deploys the EndpointV2 contracts
 *
 * @param {boolean} [writeToFileSystem] Write the deployment files to filesystem. Keep this `false` for tests to avoid race conditions
 */
export const deployEndpoint = async (writeToFileSystem: boolean = false) => {
    const environmentFactory = createGetHreByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_V2_MAINNET)

    await Promise.all([
        eth.deployments.run('EndpointV2', { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
        avax.deployments.run('EndpointV2', { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
    ])
}

/**
 * Helper function that wires the endpoint infrastructure.
 *
 * The contracts still need to be deployed (use `deployEndpoint`)
 */
export const setupDefaultEndpoint = async (): Promise<void> => {
    // This is the tooling we are going to need
    const contractFactory = createConnectedContractFactory()
    const signAndSend = createSignAndSend(createSignerFactory())
    const ulnSdkFactory = createUln302Factory(contractFactory)
    const endpointSdkFactory = createEndpointFactory(contractFactory, ulnSdkFactory)
    const priceFeedSdkFactory = createPriceFeedFactory(contractFactory)
    const executorSdkFactory = createExecutorFactory(contractFactory)

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

    // This is the graph for Executor
    const executorConfig: OmniGraphHardhat<unknown, ExecutorEdgeConfig> = {
        contracts: [
            {
                contract: ethExecutor,
            },
            {
                contract: avaxExecutor,
            },
        ],
        connections: [
            {
                from: ethExecutor,
                to: avaxExecutor,
                config: {
                    dstConfig: defaultExecutorDstConfig,
                },
            },
            {
                from: avaxExecutor,
                to: ethExecutor,
                config: {
                    dstConfig: defaultExecutorDstConfig,
                },
            },
        ],
    }

    // This is the graph for PriceFeed
    const priceFeedConfig: OmniGraphHardhat<unknown, PriceFeedEdgeConfig> = {
        contracts: [
            {
                contract: ethPriceFeed,
            },
            {
                contract: avaxPriceFeed,
            },
        ],
        connections: [
            {
                from: ethPriceFeed,
                to: avaxPriceFeed,
                config: {
                    priceData: defaultPriceData,
                },
            },
            {
                from: avaxPriceFeed,
                to: ethPriceFeed,
                config: {
                    priceData: defaultPriceData,
                },
            },
        ],
    }

    // This is the graph for SendUln302
    const sendUlnConfig: OmniGraphHardhat<Uln302NodeConfig, unknown> = {
        contracts: [
            {
                contract: ethSendUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: avaxSendUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
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
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: avaxReceiveUln,
                config: {
                    defaultUlnConfigs: [[EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig]],
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
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: avaxSendUln2_Opt2,
                config: {
                    defaultUlnConfigs: [[EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig]],
                    defaultExecutorConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
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
                    defaultUlnConfigs: [[EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig]],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: avaxReceiveUln2_Opt2,
                config: {
                    defaultUlnConfigs: [[EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig]],
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

    const builderPriceFeed = await OmniGraphBuilderHardhat.fromConfig(priceFeedConfig)
    const priceFeedTransactions = await configurePriceFeed(builderPriceFeed.graph, priceFeedSdkFactory)

    const builderExecutor = await OmniGraphBuilderHardhat.fromConfig(executorConfig)
    const executorTransactions = await configureExecutor(builderExecutor.graph, executorSdkFactory)

    const builderSendUln = await OmniGraphBuilderHardhat.fromConfig(sendUlnConfig)
    const sendUlnTransactions = await configureUln302(builderSendUln.graph, ulnSdkFactory)

    const builderReceiveUln = await OmniGraphBuilderHardhat.fromConfig(receiveUlnConfig)
    const receiveUlnTransactions = await configureUln302(builderReceiveUln.graph, ulnSdkFactory)

    const builderSendUln_Opt2 = await OmniGraphBuilderHardhat.fromConfig(sendUlnConfig_Opt2)
    const sendUlnTransactions_Opt2 = await configureUln302(builderSendUln_Opt2.graph, ulnSdkFactory)

    const builderReceiveUln_Opt2 = await OmniGraphBuilderHardhat.fromConfig(receiveUlnConfig_Opt2)
    const receiveUlnTransactions_Opt2 = await configureUln302(builderReceiveUln_Opt2.graph, ulnSdkFactory)

    const transactions = [
        ...priceFeedTransactions,
        ...executorTransactions,
        ...sendUlnTransactions,
        ...receiveUlnTransactions,
        ...endpointTransactions,
        ...sendUlnTransactions_Opt2,
        ...receiveUlnTransactions_Opt2,
    ]

    const [_, errors] = await signAndSend(transactions)
    if (errors.length === 0) return

    const errorParser = await createErrorParser()
    const parsedErrors = await Promise.all(
        errors.map(({ error, transaction: { point } }) => errorParser({ error, point }))
    )

    throw new Error(`Endpoint deployment failed:\n\n${parsedErrors.map(({ error }) => error).join('\n')}`)
}
