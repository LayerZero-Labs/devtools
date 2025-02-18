/// <reference types="hardhat-deploy/dist/src/type-extensions" />

import {
    createErrorParser,
    createOmniPointHardhatTransformer,
    createProviderFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    type OmniGraphHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'
import {
    configureEndpointV2,
    DVNDstConfig,
    DVNEdgeConfig,
    EndpointV2EdgeConfig,
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
    configureDVN,
    UlnReadUlnConfig,
    UlnReadNodeConfig,
    EndpointV2NodeConfig,
    configureUlnRead,
} from '@layerzerolabs/protocol-devtools'
import {
    createDVNFactory,
    createEndpointV2Factory,
    createExecutorFactory,
    createPriceFeedFactory,
    createUln302Factory,
    createUlnReadFactory,
} from '@layerzerolabs/protocol-devtools-evm'
import { createSignAndSend } from '@layerzerolabs/devtools'

export const ethEndpoint = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'EndpointV2' }
export const ethReceiveUln = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'ReceiveUln302' }
export const ethSendUln = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'SendUln302' }
export const ethReadLib = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'ReadLib1002' }
export const ethPriceFeed = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'PriceFeed' }
export const ethReceiveUln2_Opt2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const ethSendUln2_Opt2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'SendUln302_Opt2' }
export const ethReadLib_Opt2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'ReadLib1002_Opt2' }
export const ethExecutor = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'Executor' }
export const ethDvn = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DVN' }
export const ethDvn_Opt2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DVN_Opt2' }
export const ethDvn_Opt3 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DVN_Opt3' }
export const avaxEndpoint = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'EndpointV2' }
export const avaxReceiveUln = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'ReceiveUln302' }
export const avaxSendUln = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'SendUln302' }
export const avaxReadLib = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'ReadLib1002' }
export const avaxPriceFeed = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'PriceFeed' }
export const avaxReceiveUln2_Opt2 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const avaxSendUln2_Opt2 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'SendUln302_Opt2' }
export const avaxReadLib_Opt2 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'ReadLib1002_Opt2' }
export const avaxExecutor = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'Executor' }
export const avaxDvn = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DVN' }
export const avaxDvn_Opt2 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DVN_Opt2' }
export const avaxDvn_Opt3 = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DVN_Opt3' }
export const bscEndpoint = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'EndpointV2' }
export const bscReceiveUln = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'ReceiveUln302' }
export const bscSendUln = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'SendUln302' }
export const bscReadLib = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'ReadLib1002' }
export const bscPriceFeed = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'PriceFeed' }
export const bscReceiveUln2_Opt2 = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'ReceiveUln302_Opt2' }
export const bscSendUln2_Opt2 = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'SendUln302_Opt2' }
export const bscReadLib_Opt2 = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'ReadLib1002_Opt2' }
export const bscExecutor = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'Executor' }
export const bscDvn = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'DVN' }
export const bscDvn_Opt2 = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'DVN_Opt2' }
export const bscDvn_Opt3 = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'DVN_Opt3' }

export const MAX_MESSAGE_SIZE = 10000 // match on-chain value

const defaultPriceData: PriceData = {
    priceRatio: BigInt('100000000000000000000'),
    gasPriceInUnit: BigInt(1),
    gasPerByte: BigInt(1),
}

export const defaultExecutorDstConfig: ExecutorDstConfig = {
    lzComposeBaseGas: BigInt(0),
    lzReceiveBaseGas: BigInt(200_000),
    multiplierBps: BigInt(0),
    floorMarginUSD: BigInt(0),
    nativeCap: BigInt(250_000_000_000_000_000), // 0.25 ether
}

const defaultDVNDstConfig: DVNDstConfig = {
    gas: BigInt(200_000),
    multiplierBps: BigInt(0),
    floorMarginUSD: BigInt(0),
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
 * Helper function to generate the default UlnReadUlnConfig for a given chain.
 *
 * @param dvnAddress The local DVN address.
 * @param executorAddress The local Executor address.
 */
export const getDefaultUlnReadConfig = (dvnAddress: string, executorAddress: string): UlnReadUlnConfig => {
    return {
        executor: executorAddress,
        requiredDVNs: [dvnAddress],
        optionalDVNs: [],
        optionalDVNThreshold: 0,
    }
}

/**
 * Helper function that wires the EndpointV2 infrastructure.
 *
 * The contracts still need to be deployed (use `deployContract`)
 */
export const setupDefaultEndpointV2 = async (): Promise<void> => {
    // This is the tooling we are going to need
    const providerFactory = createProviderFactory()
    const signAndSend = createSignAndSend(createSignerFactory())
    const ulnSdkFactory = createUln302Factory(providerFactory)
    const ulnReadSdkFactory = createUlnReadFactory(providerFactory)
    const endpointV2SdkFactory = createEndpointV2Factory(providerFactory)
    const priceFeedSdkFactory = createPriceFeedFactory(providerFactory)
    const executorSdkFactory = createExecutorFactory(providerFactory)
    const dvnSdkFactory = createDVNFactory(providerFactory)
    const omnipointTransformer = createOmniPointHardhatTransformer()

    // For the graphs, we'll also need the pointers to the contracts
    const ethSendUlnPoint = await omnipointTransformer(ethSendUln)
    const avaxSendUlnPoint = await omnipointTransformer(avaxSendUln)
    const bscSendUlnPoint = await omnipointTransformer(bscSendUln)

    const ethReceiveUlnPoint = await omnipointTransformer(ethReceiveUln)
    const avaxReceiveUlnPoint = await omnipointTransformer(avaxReceiveUln)
    const bscReceiveUlnPoint = await omnipointTransformer(bscReceiveUln)

    const ethReadLibPoint = await omnipointTransformer(ethReadLib)
    const avaxReadLibPoint = await omnipointTransformer(avaxReadLib)
    const bscReadLibPoint = await omnipointTransformer(bscReadLib)

    const ethExecutorPoint = await omnipointTransformer(ethExecutor)
    const avaxExecutorPoint = await omnipointTransformer(avaxExecutor)
    const bscExecutorPoint = await omnipointTransformer(bscExecutor)

    const ethDvnPoint = await omnipointTransformer(ethDvn)
    const avaxDvnPoint = await omnipointTransformer(avaxDvn)
    const bscDvnPoint = await omnipointTransformer(bscDvn)

    const ethUlnConfig: Uln302UlnConfig = getDefaultUlnConfig(ethDvnPoint.address)
    const avaxUlnConfig: Uln302UlnConfig = getDefaultUlnConfig(avaxDvnPoint.address)
    const bscUlnConfig: Uln302UlnConfig = getDefaultUlnConfig(bscDvnPoint.address)

    const ethUlnReadConfig: UlnReadUlnConfig = getDefaultUlnReadConfig(ethDvnPoint.address, ethExecutorPoint.address)
    const avaxUlnReadConfig: UlnReadUlnConfig = getDefaultUlnReadConfig(avaxDvnPoint.address, avaxExecutorPoint.address)
    const bscUlnReadConfig: UlnReadUlnConfig = getDefaultUlnReadConfig(bscDvnPoint.address, bscExecutorPoint.address)

    // This is the graph for Executor
    const executorConfig: OmniGraphHardhat<unknown, ExecutorEdgeConfig> = {
        contracts: [
            {
                contract: ethExecutor,
            },
            {
                contract: avaxExecutor,
            },
            {
                contract: bscExecutor,
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
                from: ethExecutor,
                to: bscExecutor,
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
            {
                from: avaxExecutor,
                to: bscExecutor,
                config: {
                    dstConfig: defaultExecutorDstConfig,
                },
            },
            {
                from: bscExecutor,
                to: ethExecutor,
                config: {
                    dstConfig: defaultExecutorDstConfig,
                },
            },
            {
                from: bscExecutor,
                to: avaxExecutor,
                config: {
                    dstConfig: defaultExecutorDstConfig,
                },
            },
        ],
    }

    // This is the graph for DVN
    const dvnConfig: OmniGraphHardhat<unknown, DVNEdgeConfig> = {
        contracts: [
            {
                contract: ethDvn,
            },
            {
                contract: avaxDvn,
            },
            {
                contract: bscDvn,
            },
        ],
        connections: [
            {
                from: ethDvn,
                to: avaxDvn,
                config: {
                    dstConfig: defaultDVNDstConfig,
                },
            },
            {
                from: ethDvn,
                to: bscDvn,
                config: {
                    dstConfig: defaultDVNDstConfig,
                },
            },
            {
                from: avaxDvn,
                to: ethDvn,
                config: {
                    dstConfig: defaultDVNDstConfig,
                },
            },
            {
                from: avaxDvn,
                to: bscDvn,
                config: {
                    dstConfig: defaultDVNDstConfig,
                },
            },
            {
                from: bscDvn,
                to: ethDvn,
                config: {
                    dstConfig: defaultDVNDstConfig,
                },
            },
            {
                from: bscDvn,
                to: avaxDvn,
                config: {
                    dstConfig: defaultDVNDstConfig,
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
            {
                contract: bscPriceFeed,
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
                from: ethPriceFeed,
                to: bscPriceFeed,
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
            {
                from: avaxPriceFeed,
                to: bscPriceFeed,
                config: {
                    priceData: defaultPriceData,
                },
            },
            {
                from: bscPriceFeed,
                to: ethPriceFeed,
                config: {
                    priceData: defaultPriceData,
                },
            },
            {
                from: bscPriceFeed,
                to: avaxPriceFeed,
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
                    defaultUlnConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, ethUlnConfig],
                    ],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                        [EndpointId.BSC_V2_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: avaxSendUln,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, avaxUlnConfig],
                    ],
                    defaultExecutorConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
                        [EndpointId.BSC_V2_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: bscSendUln,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, bscUlnConfig],
                        [EndpointId.AVALANCHE_V2_MAINNET, bscUlnConfig],
                    ],
                    defaultExecutorConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, getDefaultExecutorConfig(bscExecutorPoint.address)],
                        [EndpointId.AVALANCHE_V2_MAINNET, getDefaultExecutorConfig(bscExecutorPoint.address)],
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
                    defaultUlnConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, ethUlnConfig],
                    ],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: avaxReceiveUln,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, avaxUlnConfig],
                    ],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: bscReceiveUln,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, bscUlnConfig],
                        [EndpointId.AVALANCHE_V2_MAINNET, bscUlnConfig],
                    ],
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
                    defaultUlnConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, ethUlnConfig],
                    ],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                        [EndpointId.BSC_V2_MAINNET, getDefaultExecutorConfig(ethExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: avaxSendUln2_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, avaxUlnConfig],
                    ],
                    defaultExecutorConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
                        [EndpointId.BSC_V2_MAINNET, getDefaultExecutorConfig(avaxExecutorPoint.address)],
                    ],
                },
            },
            {
                contract: bscSendUln2_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, bscUlnConfig],
                        [EndpointId.ETHEREUM_V2_MAINNET, bscUlnConfig],
                    ],
                    defaultExecutorConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, getDefaultExecutorConfig(bscExecutorPoint.address)],
                        [EndpointId.ETHEREUM_V2_MAINNET, getDefaultExecutorConfig(bscExecutorPoint.address)],
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
                    defaultUlnConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, ethUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, ethUlnConfig],
                    ],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: avaxReceiveUln2_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.ETHEREUM_V2_MAINNET, avaxUlnConfig],
                        [EndpointId.BSC_V2_MAINNET, avaxUlnConfig],
                    ],
                    defaultExecutorConfigs: [],
                },
            },
            {
                contract: bscReceiveUln2_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [EndpointId.AVALANCHE_V2_MAINNET, bscUlnConfig],
                        [EndpointId.ETHEREUM_V2_MAINNET, bscUlnConfig],
                    ],
                    defaultExecutorConfigs: [],
                },
            },
        ],
        connections: [],
    }

    // This is the graph for ReadLib1002
    const readLibConfig: OmniGraphHardhat<UlnReadNodeConfig, unknown> = {
        contracts: [
            {
                contract: ethReadLib,
                config: {
                    defaultUlnConfigs: [
                        [ChannelId.READ_CHANNEL_1, ethUlnReadConfig],
                        [ChannelId.READ_CHANNEL_2, ethUlnReadConfig],
                    ],
                },
            },
            {
                contract: avaxReadLib,
                config: {
                    defaultUlnConfigs: [
                        [ChannelId.READ_CHANNEL_1, avaxUlnReadConfig],
                        [ChannelId.READ_CHANNEL_2, avaxUlnReadConfig],
                    ],
                },
            },
            {
                contract: bscReadLib,
                config: {
                    defaultUlnConfigs: [
                        [ChannelId.READ_CHANNEL_1, bscUlnReadConfig],
                        [ChannelId.READ_CHANNEL_2, bscUlnReadConfig],
                    ],
                },
            },
        ],
        connections: [],
    }

    // This is the graph for ReadLib1002
    const readLibConfig_Opt2: OmniGraphHardhat<UlnReadNodeConfig, unknown> = {
        contracts: [
            {
                contract: ethReadLib_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [ChannelId.READ_CHANNEL_1, ethUlnReadConfig],
                        [ChannelId.READ_CHANNEL_2, ethUlnReadConfig],
                    ],
                },
            },
            {
                contract: avaxReadLib_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [ChannelId.READ_CHANNEL_1, avaxUlnReadConfig],
                        [ChannelId.READ_CHANNEL_2, avaxUlnReadConfig],
                    ],
                },
            },
            {
                contract: bscReadLib_Opt2,
                config: {
                    defaultUlnConfigs: [
                        [ChannelId.READ_CHANNEL_1, bscUlnReadConfig],
                        [ChannelId.READ_CHANNEL_2, bscUlnReadConfig],
                    ],
                },
            },
        ],
        connections: [],
    }

    // This is the graph for EndpointV2
    const config: OmniGraphHardhat<EndpointV2NodeConfig, EndpointV2EdgeConfig> = {
        contracts: [
            {
                contract: ethEndpoint,
                config: {
                    readChannelConfigs: [
                        { channelId: ChannelId.READ_CHANNEL_1, defaultReadLibrary: ethReadLibPoint.address },
                        { channelId: ChannelId.READ_CHANNEL_2, defaultReadLibrary: ethReadLibPoint.address },
                    ],
                },
            },
            {
                contract: avaxEndpoint,
                config: {
                    readChannelConfigs: [
                        { channelId: ChannelId.READ_CHANNEL_1, defaultReadLibrary: avaxReadLibPoint.address },
                        { channelId: ChannelId.READ_CHANNEL_2, defaultReadLibrary: avaxReadLibPoint.address },
                    ],
                },
            },
            {
                contract: bscEndpoint,
                config: {
                    readChannelConfigs: [
                        { channelId: ChannelId.READ_CHANNEL_1, defaultReadLibrary: bscReadLibPoint.address },
                        { channelId: ChannelId.READ_CHANNEL_2, defaultReadLibrary: bscReadLibPoint.address },
                    ],
                },
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
                from: ethEndpoint,
                to: bscEndpoint,
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
            {
                from: avaxEndpoint,
                to: bscEndpoint,
                config: {
                    defaultReceiveLibrary: avaxReceiveUlnPoint.address,
                    defaultSendLibrary: avaxSendUlnPoint.address,
                },
            },
            {
                from: bscEndpoint,
                to: ethEndpoint,
                config: {
                    defaultReceiveLibrary: bscReceiveUlnPoint.address,
                    defaultSendLibrary: bscSendUlnPoint.address,
                },
            },
            {
                from: bscEndpoint,
                to: avaxEndpoint,
                config: {
                    defaultReceiveLibrary: bscReceiveUlnPoint.address,
                    defaultSendLibrary: bscSendUlnPoint.address,
                },
            },
        ],
    }

    // Now we compile a list of all the transactions that need to be executed for the ULNs and Endpoints
    const builderEndpoint = await OmniGraphBuilderHardhat.fromConfig(config)
    const endpointV2Transactions = await configureEndpointV2(builderEndpoint.graph, endpointV2SdkFactory)

    const builderPriceFeed = await OmniGraphBuilderHardhat.fromConfig(priceFeedConfig)
    const priceFeedTransactions = await configurePriceFeed(builderPriceFeed.graph, priceFeedSdkFactory)

    const builderExecutor = await OmniGraphBuilderHardhat.fromConfig(executorConfig)
    const executorTransactions = await configureExecutor(builderExecutor.graph, executorSdkFactory)

    const builderDvn = await OmniGraphBuilderHardhat.fromConfig(dvnConfig)
    const dvnTransactions = await configureDVN(builderDvn.graph, dvnSdkFactory)

    const builderSendUln = await OmniGraphBuilderHardhat.fromConfig(sendUlnConfig)
    const sendUlnTransactions = await configureUln302(builderSendUln.graph, ulnSdkFactory)

    const builderReceiveUln = await OmniGraphBuilderHardhat.fromConfig(receiveUlnConfig)
    const receiveUlnTransactions = await configureUln302(builderReceiveUln.graph, ulnSdkFactory)

    const builderReadLib = await OmniGraphBuilderHardhat.fromConfig(readLibConfig)
    const readLibTransactions = await configureUlnRead(builderReadLib.graph, ulnReadSdkFactory)

    const builderSendUln_Opt2 = await OmniGraphBuilderHardhat.fromConfig(sendUlnConfig_Opt2)
    const sendUlnTransactions_Opt2 = await configureUln302(builderSendUln_Opt2.graph, ulnSdkFactory)

    const builderReceiveUln_Opt2 = await OmniGraphBuilderHardhat.fromConfig(receiveUlnConfig_Opt2)
    const receiveUlnTransactions_Opt2 = await configureUln302(builderReceiveUln_Opt2.graph, ulnSdkFactory)

    const buildReadLib_Opt2 = await OmniGraphBuilderHardhat.fromConfig(readLibConfig_Opt2)
    const readLibTransactions_Opt2 = await configureUlnRead(buildReadLib_Opt2.graph, ulnReadSdkFactory)

    const transactions = [
        ...priceFeedTransactions,
        ...dvnTransactions,
        ...executorTransactions,
        ...sendUlnTransactions,
        ...receiveUlnTransactions,
        ...readLibTransactions,
        ...endpointV2Transactions,
        ...sendUlnTransactions_Opt2,
        ...receiveUlnTransactions_Opt2,
        ...readLibTransactions_Opt2,
    ]

    const [_, errors] = await signAndSend(transactions)
    if (errors.length === 0) {
        return
    }

    const errorParser = await createErrorParser()
    const parsedErrors = await Promise.all(errors.map(({ error }) => errorParser(error)))

    throw new Error(`Endpoint deployment failed:\n\n${parsedErrors.join('\n')}`)
}
