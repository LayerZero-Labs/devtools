import 'hardhat'
import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'
import {
    createConnectedContractFactory,
    createSignerFactory,
    OmniContractFactoryHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppReadFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOAppRead, IOAppRead, OAppReadFactory, OAppReadOmniGraph } from '@layerzerolabs/ua-devtools'
import { OmniContract, omniContractToPoint } from '@layerzerolabs/devtools-evm'
import {
    setupDefaultEndpointV2,
    deployContract,
    ethDvn,
    ethDvn_Opt2,
    ethDvn_Opt3,
    ethExecutor,
    getLibraryAddress,
    ethReadLib,
    avaxReadLib,
    avaxExecutor,
    avaxDvn,
    ethReadLib_Opt2,
    avaxReadLib_Opt2,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { createSignAndSend, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { IEndpointV2 } from '@layerzerolabs/protocol-devtools'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

describe('oapp-read/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOAppRead' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOAppRead' }

    let contractFactory: OmniContractFactoryHardhat
    let signAndSend
    let oappSdkFactory: OAppReadFactory

    let ethContract: OmniContract
    let ethPoint: OmniPoint
    let ethOAppSdk: IOAppRead
    let ethEndpointV2Sdk: IEndpointV2

    let avaxContract: OmniContract
    let avaxPoint: OmniPoint
    let avaxOAppSdk: IOAppRead
    let avaxEndpointV2Sdk: IEndpointV2

    let transactions: OmniTransaction[]

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
        await deployContract('OAppRead')

        contractFactory = createConnectedContractFactory()
        signAndSend = createSignAndSend(createSignerFactory())
        oappSdkFactory = createOAppReadFactory(contractFactory)

        ethContract = await contractFactory(ethPointHardhat)
        avaxContract = await contractFactory(avaxPointHardhat)

        ethPoint = omniContractToPoint(ethContract)
        ethOAppSdk = await oappSdkFactory(ethPoint)

        avaxPoint = omniContractToPoint(avaxContract)
        avaxOAppSdk = await oappSdkFactory(avaxPoint)

        ethEndpointV2Sdk = await ethOAppSdk.getEndpointSDK()
        avaxEndpointV2Sdk = await avaxOAppSdk.getEndpointSDK()
    })

    describe('configureOAppReadChannels', () => {
        let graph: OAppReadOmniGraph
        beforeEach(async () => {
            graph = {
                contracts: [
                    {
                        point: ethPoint,
                        config: {
                            readChannelConfigs: [{ channelId: ChannelId.READ_CHANNEL_1 }],
                        },
                    },
                    {
                        point: avaxPoint,
                        config: {
                            readChannelConfigs: [{ channelId: ChannelId.READ_CHANNEL_1 }],
                        },
                    },
                ],
                connections: [],
            }
        })

        it('should return all setReadChannel transactions', async () => {
            // This is the OApp config that we want to use against our contracts
            transactions = await configureOAppRead(graph, oappSdkFactory)
            const expectedTransactions = [
                await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
                await avaxOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
            ]
            expect(transactions).toEqual(expectedTransactions)
        })

        it('should exclude setReadChannel transactions for channels that have been set', async () => {
            // Before we configure the OApp, we'll set some channels
            const signerFactory = createSignerFactory()
            const ethSigner = await signerFactory(ethContract.eid)
            const ethTransaction = await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true)
            const ethResponse = await ethSigner.signAndSend(ethTransaction)
            const ethReceipt = await ethResponse.wait()
            expect(ethReceipt.from).toBe(await ethSigner.signer.getAddress())

            // Now we configure the OApp
            transactions = await configureOAppRead(graph, oappSdkFactory)
            // And expect the setPeer on the eth contact not to be there
            expect(transactions).toEqual([await avaxOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true)])
        })

        afterEach(async () => {
            const [_, errors] = await signAndSend(transactions)
            // eslint-disable-next-line jest/no-standalone-expect
            expect(errors).toEqual([])
            const transactionsAgain = await configureOAppRead(graph, oappSdkFactory)
            // eslint-disable-next-line jest/no-standalone-expect
            expect(transactionsAgain).toEqual([])
        })
    })

    describe('configureOAppRead', () => {
        it('should return an empty array with an empty config', async () => {
            const graph: OAppReadOmniGraph = {
                contracts: [],
                connections: [],
            }

            // Now we configure the OApp
            const transactions = await configureOAppRead(graph, oappSdkFactory)
            expect(transactions).toEqual([])
        })

        beforeEach(async () => {
            const [_, errors] = await signAndSend([
                await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
                await avaxOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
            ])

            // eslint-disable-next-line jest/no-standalone-expect
            expect(errors).toEqual([])
        })

        describe('configureReadLibraries lock defaults', () => {
            let ethReadLibrary: string, avaxReadLibrary: string, graph: OAppReadOmniGraph
            beforeEach(async () => {
                ethReadLibrary = await getLibraryAddress(ethReadLib)
                avaxReadLibrary = await getLibraryAddress(avaxReadLib)
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    { channelId: ChannelId.READ_CHANNEL_1, readLibrary: ethReadLibrary },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                            config: {
                                readChannelConfigs: [
                                    { channelId: ChannelId.READ_CHANNEL_1, readLibrary: avaxReadLibrary },
                                ],
                            },
                        },
                    ],
                    connections: [],
                }
            })

            it('should lock in default configureReadLibraries transactions', async () => {
                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.setSendLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary,
                        BigInt(0)
                    ),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOAppRead(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureReadLibraries', () => {
            let ethReadLibrary: string, avaxReadLibrary: string, graph: OAppReadOmniGraph

            beforeEach(async () => {
                ethReadLibrary = await getLibraryAddress(ethReadLib_Opt2)
                avaxReadLibrary = await getLibraryAddress(avaxReadLib_Opt2)
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.registerLibrary(ethReadLibrary),
                    await avaxEndpointV2Sdk.registerLibrary(avaxReadLibrary),
                ])
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    { channelId: ChannelId.READ_CHANNEL_1, readLibrary: ethReadLibrary },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                            config: {
                                readChannelConfigs: [
                                    { channelId: ChannelId.READ_CHANNEL_1, readLibrary: avaxReadLibrary },
                                ],
                            },
                        },
                    ],
                    connections: [],
                }
            })

            it('should configureReadLibraries transactions', async () => {
                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.setSendLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary,
                        BigInt(0)
                    ),
                ])
            })

            it('should return one configureSendLibraries transaction', async () => {
                // Before we configure the OApp, we'll register and set one of the read libraries
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                ])
                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await avaxEndpointV2Sdk.setSendLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary,
                        BigInt(0)
                    ),
                ])
            })

            it('should return only configureSendLibraries sendLibrary transaction', async () => {
                // Before we configure the OApp, we'll register and set one of the read libraries
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary,
                        BigInt(0)
                    ),
                ])
                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await avaxEndpointV2Sdk.setSendLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary
                    ),
                ])
            })

            it('should return only configureSendLibraries receiveLibrary transaction', async () => {
                // Before we configure the OApp, we'll register and set one of the read libraries
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await avaxEndpointV2Sdk.setSendLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary
                    ),
                ])
                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
                        avaxPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        avaxReadLibrary,
                        BigInt(0)
                    ),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOAppRead(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureConfig configureReadConfig', () => {
            beforeEach(async () => {
                // Before we configure the OApp, we'll set some peers
                const [_, errors] = await signAndSend([
                    await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
                    await avaxOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
                ])

                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
            })

            describe('configureReadConfig', () => {
                let graph: OAppReadOmniGraph,
                    ethExecutorAddress: string,
                    ethDvnAddress: string,
                    ethReadLibrary: string,
                    avaxExecutorAddress: string,
                    avaxDvnAddress: string,
                    avaxReadLibrary: string

                beforeEach(async () => {
                    ethExecutorAddress = await getLibraryAddress(ethExecutor)
                    ethDvnAddress = await getLibraryAddress(ethDvn)
                    ethReadLibrary = await getLibraryAddress(ethReadLib)
                    avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
                    avaxDvnAddress = await getLibraryAddress(avaxDvn)
                    avaxReadLibrary = await getLibraryAddress(avaxReadLib)

                    graph = {
                        contracts: [
                            {
                                point: ethPoint,
                                config: {
                                    readChannelConfigs: [
                                        {
                                            channelId: ChannelId.READ_CHANNEL_1,
                                            ulnConfig: {
                                                executor: ethExecutorAddress,
                                                requiredDVNs: [ethDvnAddress],
                                                optionalDVNs: [ethDvnAddress],
                                                optionalDVNThreshold: 1,
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                point: avaxPoint,
                                config: {
                                    readChannelConfigs: [
                                        {
                                            channelId: ChannelId.READ_CHANNEL_1,
                                            ulnConfig: {
                                                executor: avaxExecutorAddress,
                                                requiredDVNs: [avaxDvnAddress],
                                                optionalDVNs: [avaxDvnAddress],
                                                optionalDVNThreshold: 1,
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                        connections: [],
                    }
                })

                it('should return all configureReadConfig transactions', async () => {
                    transactions = await configureOAppRead(graph, oappSdkFactory)
                    const expectedTransactions = [
                        ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReadLibrary, [
                            ...(await ethEndpointV2Sdk.getUlnReadConfigParams(ethReadLibrary, [
                                {
                                    channelId: ChannelId.READ_CHANNEL_1.valueOf(),
                                    ulnConfig: {
                                        executor: ethExecutorAddress,
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ])),
                        ...(await avaxEndpointV2Sdk.setConfig(avaxPoint.address, avaxReadLibrary, [
                            ...(await avaxEndpointV2Sdk.getUlnReadConfigParams(avaxReadLibrary, [
                                {
                                    channelId: ChannelId.READ_CHANNEL_1.valueOf(),
                                    ulnConfig: {
                                        executor: avaxExecutorAddress,
                                        requiredDVNs: [avaxDvnAddress],
                                        optionalDVNs: [avaxDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ])),
                    ]
                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should return one configureReadConfig transaction', async () => {
                    const [_, errors] = await signAndSend(
                        await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReadLibrary, [
                            ...(await ethEndpointV2Sdk.getUlnReadConfigParams(ethReadLibrary, [
                                {
                                    channelId: ChannelId.READ_CHANNEL_1.valueOf(),
                                    ulnConfig: {
                                        executor: ethExecutorAddress,
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ])
                    )
                    expect(errors).toEqual([])

                    // Now we configure the OApp
                    transactions = await configureOAppRead(graph, oappSdkFactory)
                    const expectedTransactions = await avaxEndpointV2Sdk.setConfig(avaxPoint.address, avaxReadLibrary, [
                        ...(await avaxEndpointV2Sdk.getUlnReadConfigParams(avaxReadLibrary, [
                            {
                                channelId: ChannelId.READ_CHANNEL_1.valueOf(),
                                ulnConfig: {
                                    executor: avaxExecutorAddress,
                                    requiredDVNs: [avaxDvnAddress],
                                    optionalDVNs: [avaxDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ])

                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should not take the order of requiredDVNs into account', async () => {
                    const requiredDVNs = await Promise.all([
                        getLibraryAddress(ethDvn),
                        getLibraryAddress(ethDvn_Opt2),
                        getLibraryAddress(ethDvn_Opt3),
                    ])

                    const ulnConfig = {
                        executor: ethExecutorAddress,
                        requiredDVNs,
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    }

                    const readChannelConfig = {
                        channelId: ChannelId.READ_CHANNEL_1,
                        readLibrary: ethReadLibrary,
                        ulnConfig,
                    }

                    const graph: OAppReadOmniGraph = {
                        contracts: [
                            {
                                point: ethPoint,
                                config: {
                                    readChannelConfigs: [readChannelConfig],
                                },
                            },
                        ],
                        connections: [],
                    }

                    // First we configure the OApp with the original graph
                    const [_, errors] = await signAndSend(await configureOAppRead(graph, oappSdkFactory))
                    expect(errors).toEqual([])

                    // Now we change the order of the DVNs
                    const changedGraph: OAppReadOmniGraph = {
                        ...graph,
                        contracts: [
                            {
                                point: ethPoint,
                                config: {
                                    readChannelConfigs: [
                                        {
                                            ...readChannelConfig,
                                            ulnConfig: {
                                                ...ulnConfig,
                                                requiredDVNs: requiredDVNs.reverse(),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    }

                    // And this change should result in no change in the OApp
                    const transactions = await configureOAppRead(changedGraph, oappSdkFactory)
                    expect(transactions).toEqual([])
                })

                it('should not take the order of optionalDVNs into account', async () => {
                    const optionalDVNs = await Promise.all([
                        getLibraryAddress(ethDvn),
                        getLibraryAddress(ethDvn_Opt2),
                        getLibraryAddress(ethDvn_Opt3),
                    ])

                    const ulnConfig = {
                        executor: ethExecutorAddress,
                        requiredDVNs: [],
                        optionalDVNs,
                        optionalDVNThreshold: 3,
                    }

                    const readChannelConfig = {
                        channelId: ChannelId.READ_CHANNEL_1,
                        readLibrary: ethReadLibrary,
                        ulnConfig,
                    }

                    const graph: OAppReadOmniGraph = {
                        contracts: [
                            {
                                point: ethPoint,
                                config: {
                                    readChannelConfigs: [readChannelConfig],
                                },
                            },
                        ],
                        connections: [],
                    }

                    // First we configure the OApp with the original graph
                    const [_, errors] = await signAndSend(await configureOAppRead(graph, oappSdkFactory))
                    expect(errors).toEqual([])

                    // Now we change the order of the DVNs
                    const changedGraph: OAppReadOmniGraph = {
                        ...graph,
                        contracts: [
                            {
                                point: ethPoint,
                                config: {
                                    readChannelConfigs: [
                                        {
                                            ...readChannelConfig,
                                            ulnConfig: {
                                                ...ulnConfig,
                                                optionalDVNs: optionalDVNs.reverse(),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    }

                    // And this change should result in no change in the OApp
                    const transactions = await configureOAppRead(changedGraph, oappSdkFactory)
                    expect(transactions).toEqual([])
                })
            })
        })

        describe('setAll configs', () => {
            let graph: OAppReadOmniGraph
            it('should return all setConfig transactions', async () => {
                const ethExecutorAddress = await getLibraryAddress(ethExecutor)
                const ethReadLibrary = await getLibraryAddress(ethReadLib_Opt2)
                const ethDvnAddress = await getLibraryAddress(ethDvn)

                const [_, errors] = await signAndSend([await ethEndpointV2Sdk.registerLibrary(ethReadLibrary)])
                expect(errors).toEqual([])

                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        readLibrary: ethReadLibrary,
                                        ulnConfig: {
                                            executor: ethExecutorAddress,
                                            requiredDVNs: [ethDvnAddress],
                                            optionalDVNs: [ethDvnAddress],
                                            optionalDVNThreshold: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [],
                }

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReadLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnReadConfigParams(ethReadLibrary, [
                            {
                                channelId: ChannelId.READ_CHANNEL_1,
                                ulnConfig: {
                                    executor: ethExecutorAddress,
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ])),
                ])
            })

            it('should return all setConfig transactions in parallel mode', async () => {
                const ethExecutorAddress = await getLibraryAddress(ethExecutor)
                const ethReadLibrary = await getLibraryAddress(ethReadLib_Opt2)
                const ethDvnAddress = await getLibraryAddress(ethDvn)

                const [_, errors] = await signAndSend([await ethEndpointV2Sdk.registerLibrary(ethReadLibrary)])
                expect(errors).toEqual([])

                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        readLibrary: ethReadLibrary,
                                        ulnConfig: {
                                            executor: ethExecutorAddress,
                                            requiredDVNs: [ethDvnAddress],
                                            optionalDVNs: [ethDvnAddress],
                                            optionalDVNThreshold: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [],
                }
                // We set the mode to parallel
                process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = '1'

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary
                    ),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        ChannelId.READ_CHANNEL_1.valueOf(),
                        ethReadLibrary,
                        BigInt(0)
                    ),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReadLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnReadConfigParams(ethReadLibrary, [
                            {
                                channelId: ChannelId.READ_CHANNEL_1,
                                ulnConfig: {
                                    executor: ethExecutorAddress,
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ])),
                ])
            })

            afterEach(async () => {
                // We reset the parallel mode
                process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = undefined

                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOAppRead(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureEnforcedOptions', () => {
            let graph: OAppReadOmniGraph

            beforeEach(async () => {
                // Before we configure the OApp, we'll set read channel
                const [_, errors] = await signAndSend([
                    await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
                    await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_2, true),
                    await avaxOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true),
                ])

                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
            })

            it('should return empty transactions when enforcedOptions is empty', async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [],
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [],
                                    },
                                ],
                            },
                        },
                    ],
                    connections: [],
                }

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                expect(transactions).toEqual([])
            })

            it("should return addExecutorLzReadOption tx's in both directions for msgType: 1", async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '200000',
                                                size: '100',
                                                value: '0',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '200000',
                                                size: '100',
                                                value: '0',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                    connections: [],
                }
                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                const options = Options.newOptions().addExecutorLzReadOption(200000, 100, 0).toHex().toLowerCase()
                expect(transactions).toEqual([
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: ChannelId.READ_CHANNEL_1.valueOf(),
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                    await avaxOAppSdk.setEnforcedOptions([
                        {
                            eid: ChannelId.READ_CHANNEL_1.valueOf(),
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ])
            })

            it("should combine addExecutorLzReadOption's into one tx for both chains for msgType: 1", async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '200000',
                                                size: '100',
                                                value: '0',
                                            },
                                        ],
                                    },
                                    {
                                        channelId: ChannelId.READ_CHANNEL_2,
                                        enforcedOptions: [
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '200000',
                                                size: '100',
                                                value: '0',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [],
                }
                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                const options = Options.newOptions().addExecutorLzReadOption(200000, 100, 0).toHex().toLowerCase()
                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: ChannelId.READ_CHANNEL_1.valueOf(),
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                        {
                            eid: ChannelId.READ_CHANNEL_2.valueOf(),
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine addExecutorLzReadOption settings for one chain into one transaction for msgType: 1', async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '250000',
                                                size: '100',
                                                value: '0',
                                            },
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '550000',
                                                size: '200',
                                                value: '2',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [],
                }
                const options = Options.newOptions()
                    .addExecutorLzReadOption(250000, 100, 0)
                    .addExecutorLzReadOption(550000, 200, 2)
                    .toHex()
                    .toLowerCase()

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)
                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: ChannelId.READ_CHANNEL_1.valueOf(),
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine diff option types (LZ_READ & COMPOSE) for msgType: 1 and one option type (LZ_READ) for msgType: 2 w/ multiple channels', async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                            config: {
                                readChannelConfigs: [
                                    {
                                        channelId: ChannelId.READ_CHANNEL_1,
                                        enforcedOptions: [
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '250000',
                                                size: '100',
                                                value: '0',
                                            },
                                            {
                                                msgType: 1,
                                                optionType: ExecutorOptionType.COMPOSE,
                                                index: 0,
                                                gas: '200000',
                                                value: '1',
                                            },
                                            {
                                                msgType: 2,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '300000',
                                                size: '300',
                                                value: '2',
                                            },
                                        ],
                                    },
                                    {
                                        channelId: ChannelId.READ_CHANNEL_2,
                                        enforcedOptions: [
                                            {
                                                msgType: 2,
                                                optionType: ExecutorOptionType.LZ_READ,
                                                gas: '5550000',
                                                size: '200',
                                                value: '3',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [],
                }

                // Now we configure the OApp
                transactions = await configureOAppRead(graph, oappSdkFactory)

                const channel1OptionsMsgType1 = Options.newOptions()
                    .addExecutorLzReadOption(250000, 100, 0)
                    .addExecutorComposeOption(0, 200000, 1)
                    .toHex()
                    .toLowerCase()

                const channel1OptionsMsgType2 = Options.newOptions()
                    .addExecutorLzReadOption(300000, 300, 2)
                    .toHex()
                    .toLowerCase()

                const channel2OptionsMsgType2 = Options.newOptions()
                    .addExecutorLzReadOption(5550000, 200, 3)
                    .toHex()
                    .toLowerCase()

                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: ChannelId.READ_CHANNEL_1.valueOf(),
                            option: {
                                msgType: 1,
                                options: channel1OptionsMsgType1,
                            },
                        },
                        {
                            eid: ChannelId.READ_CHANNEL_1.valueOf(),
                            option: {
                                msgType: 2,
                                options: channel1OptionsMsgType2,
                            },
                        },
                        {
                            eid: ChannelId.READ_CHANNEL_2.valueOf(),
                            option: {
                                msgType: 2,
                                options: channel2OptionsMsgType2,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })
        })
    })
})
