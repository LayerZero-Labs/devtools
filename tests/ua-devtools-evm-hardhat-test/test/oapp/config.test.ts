import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deployOApp } from '../__utils__/oapp'
import {
    OmniContractFactoryHardhat,
    createConnectedContractFactory,
    createSignerFactory,
    createProviderFactory,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOApp, IOApp, OAppFactory, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OmniContract, omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { getLibraryAddress } from '../__utils__/oapp'
import {
    setupDefaultEndpoint,
    avaxExecutor,
    avaxDvn,
    avaxDvn_Opt2,
    avaxDvn_Opt3,
    ethSendUln,
    deployEndpoint,
    bscExecutor,
    bscDvn,
    ethSendUln2_Opt2,
    avaxSendUln2_Opt2,
    ethReceiveUln2_Opt2,
    avaxReceiveUln2_Opt2,
    ethReceiveUln,
    avaxReceiveUln,
    ethDvn,
} from '../__utils__/endpoint'
import { createSignAndSend, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { IEndpoint } from '@layerzerolabs/protocol-devtools'

describe('oapp/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }
    const bscPointHardhat = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'DefaultOApp' }

    let contractFactory: OmniContractFactoryHardhat
    let signAndSend
    let oappSdkFactory: OAppFactory

    let ethContract: OmniContract
    let ethPoint: OmniPoint
    let ethOAppSdk: IOApp
    let ethEndpointSdk: IEndpoint

    let avaxContract: OmniContract
    let avaxPoint: OmniPoint
    let avaxOAppSdk: IOApp
    let avaxEndpointSdk: IEndpoint
    let transactions: OmniTransaction[]

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployEndpoint()
        await setupDefaultEndpoint()
        await deployOApp()

        contractFactory = createConnectedContractFactory()
        signAndSend = createSignAndSend(createSignerFactory())
        oappSdkFactory = createOAppFactory(contractFactory)

        ethContract = await contractFactory(ethPointHardhat)
        avaxContract = await contractFactory(avaxPointHardhat)

        ethPoint = omniContractToPoint(ethContract)
        ethOAppSdk = await oappSdkFactory(ethPoint)

        avaxPoint = omniContractToPoint(avaxContract)
        avaxOAppSdk = await oappSdkFactory(avaxPoint)

        ethEndpointSdk = await ethOAppSdk.getEndpointSDK()
        avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()
    })

    describe('configureOAppPeers', () => {
        let graph: OAppOmniGraph
        beforeEach(async () => {
            graph = {
                contracts: [
                    {
                        point: ethPoint,
                    },
                    {
                        point: avaxPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethPoint, to: avaxPoint },
                        config: undefined,
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: undefined,
                    },
                ],
            }
        })

        it('should return all setPeer transactions', async () => {
            // This is the OApp config that we want to use against our contracts
            transactions = await configureOApp(graph, oappSdkFactory)
            const expectedTransactions = [
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ]
            expect(transactions).toEqual(expectedTransactions)
        })
        it('should exclude setPeer transactions for peers that have been set', async () => {
            // Before we configure the OApp, we'll set some peers
            const signerFactory = createSignerFactory()
            const ethSigner = await signerFactory(ethContract.eid)
            const ethTransaction = await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address)
            const ethResponse = await ethSigner.signAndSend(ethTransaction)
            const ethReceipt = await ethResponse.wait()
            expect(ethReceipt.from).toBe(await ethSigner.signer.getAddress())

            // Now we configure the OApp
            transactions = await configureOApp(graph, oappSdkFactory)
            // And expect the setPeer on the eth contact not to be there
            expect(transactions).toEqual([await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address)])
        })

        afterEach(async () => {
            const [_, errors] = await signAndSend(transactions)
            // eslint-disable-next-line jest/no-standalone-expect
            expect(errors).toEqual([])
            const transactionsAgain = await configureOApp(graph, oappSdkFactory)
            // eslint-disable-next-line jest/no-standalone-expect
            expect(transactionsAgain).toEqual([])
        })
    })

    describe('configureOApp', () => {
        it('should return an empty array with an empty config', async () => {
            const graph: OAppOmniGraph = {
                contracts: [],
                connections: [],
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([])
        })

        beforeEach(async () => {
            const [_, errors] = await signAndSend([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ])

            // eslint-disable-next-line jest/no-standalone-expect
            expect(errors).toEqual([])
        })

        describe('configureSendLibraries', () => {
            let ethSendLibrary: string, avaxSendLibrary: string, graph: OAppOmniGraph
            beforeEach(async () => {
                ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
                avaxSendLibrary = await getLibraryAddress(avaxSendUln2_Opt2)
                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.registerLibrary(ethSendLibrary),
                    await avaxEndpointSdk.registerLibrary(avaxSendLibrary),
                ])
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                sendLibrary: ethSendLibrary,
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {
                                sendLibrary: avaxSendLibrary,
                            },
                        },
                    ],
                }
            })

            it('should configureSendLibraries transactions', async () => {
                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                    await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
                ])
            })

            it('should return one configureSendLibraries transaction', async () => {
                // Before we configure the OApp, we'll register and set one of the send libraries
                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                ])
                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureReceiveLibraries', () => {
            let ethReceiveLibrary: string, avaxReceiveLibrary: string, graph: OAppOmniGraph
            beforeEach(async () => {
                ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
                avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln2_Opt2)
                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.registerLibrary(ethReceiveLibrary),
                    await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary),
                ])
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])

                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                receiveLibraryConfig: {
                                    receiveLibrary: ethReceiveLibrary,
                                    gracePeriod: BigInt(0),
                                },
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {
                                receiveLibraryConfig: {
                                    receiveLibrary: avaxReceiveLibrary,
                                    gracePeriod: BigInt(0),
                                },
                            },
                        },
                    ],
                }
            })

            it('should return all configureReceiveLibraries transactions', async () => {
                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointSdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointSdk.setReceiveLibrary(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxReceiveLibrary,
                        BigInt(0)
                    ),
                ])
            })
            it('should return one configureReceiveLibraries transaction', async () => {
                // Before we configure the OApp, we'll register and set one of the receiving libraries
                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                ])
                expect(errors).toEqual([])

                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await avaxEndpointSdk.setReceiveLibrary(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxReceiveLibrary,
                        BigInt(0)
                    ),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureReceiveLibraryTimeouts', () => {
            let ethDefaultReceiveLibrary: string,
                ethReceiveLibrary_Opt2: string,
                avaxDefaultReceiveLibrary: string,
                avaxReceiveLibrary_Opt2: string,
                graph: OAppOmniGraph,
                expiryEthBlock: bigint,
                expiryAvaxBlock: bigint

            beforeEach(async () => {
                ethDefaultReceiveLibrary = await getLibraryAddress(ethReceiveUln)
                ethReceiveLibrary_Opt2 = await getLibraryAddress(ethReceiveUln2_Opt2)

                avaxDefaultReceiveLibrary = await getLibraryAddress(avaxReceiveUln)
                avaxReceiveLibrary_Opt2 = await getLibraryAddress(avaxReceiveUln2_Opt2)

                const createProvider = createProviderFactory()
                const ethProvider = await createProvider(EndpointId.ETHEREUM_V2_MAINNET)
                const latestEthBlock = (await ethProvider.getBlock('latest')).number
                expiryEthBlock = BigInt(latestEthBlock + 1000)

                const avaxProvider = await createProvider(EndpointId.AVALANCHE_V2_MAINNET)
                const latestAvaxBlock = (await avaxProvider.getBlock('latest')).number
                expiryAvaxBlock = BigInt(latestAvaxBlock + 1000)

                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                receiveLibraryConfig: {
                                    receiveLibrary: ethReceiveLibrary_Opt2,
                                    gracePeriod: BigInt(0),
                                },
                                receiveLibraryTimeoutConfig: {
                                    lib: ethDefaultReceiveLibrary,
                                    expiry: expiryEthBlock,
                                },
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {
                                receiveLibraryConfig: {
                                    receiveLibrary: avaxReceiveLibrary_Opt2,
                                    gracePeriod: BigInt(0),
                                },
                                receiveLibraryTimeoutConfig: {
                                    lib: avaxDefaultReceiveLibrary,
                                    expiry: expiryAvaxBlock,
                                },
                            },
                        },
                    ],
                }
            })

            it('should return all configureReceiveLibraryTimeouts transactions', async () => {
                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.registerLibrary(ethReceiveLibrary_Opt2),
                    await ethEndpointSdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                    await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary_Opt2),
                    await avaxEndpointSdk.setReceiveLibrary(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                ])

                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointSdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    ),
                    await avaxEndpointSdk.setReceiveLibraryTimeout(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxDefaultReceiveLibrary,
                        expiryAvaxBlock
                    ),
                ])
            })

            it('should return one configureReceiveLibraryTimeouts transactions', async () => {
                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.registerLibrary(ethReceiveLibrary_Opt2),
                    await ethEndpointSdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                    await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary_Opt2),
                    await avaxEndpointSdk.setReceiveLibrary(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                    await ethEndpointSdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    ),
                ])

                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                const expectedTransactions = [
                    await avaxEndpointSdk.setReceiveLibraryTimeout(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxDefaultReceiveLibrary,
                        expiryAvaxBlock
                    ),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureConfig configureSendConfig and configureReceiveConfig separately', () => {
            let bscContract, bscPoint, bscOAppSdk
            beforeEach(async () => {
                bscContract = await contractFactory(bscPointHardhat)
                bscPoint = omniContractToPoint(bscContract)
                bscOAppSdk = await oappSdkFactory(bscPoint)
                // Before we configure the OApp, we'll set some peers
                const [_, errors] = await signAndSend([
                    await ethOAppSdk.setPeer(bscPoint.eid, bscPoint.address),
                    await avaxOAppSdk.setPeer(bscPoint.eid, bscPoint.address),
                    await bscOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                    await bscOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                ])

                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
            })

            describe('configureSendConfig', () => {
                let graph: OAppOmniGraph,
                    bscExecutorAddress: string,
                    bscDvnAddress: string,
                    avaxExecutorAddress: string,
                    avaxDvnAddress: string,
                    ethToAvaxSendUlnDVNs: string[],
                    ethToBscSendUlnDVNs: string[],
                    ethSendLibrary: string

                beforeEach(async () => {
                    bscExecutorAddress = await getLibraryAddress(bscExecutor)
                    bscDvnAddress = await getLibraryAddress(bscDvn)

                    avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
                    avaxDvnAddress = await getLibraryAddress(avaxDvn)

                    ethToAvaxSendUlnDVNs = [avaxDvnAddress]
                    ethToBscSendUlnDVNs = [bscDvnAddress]
                    ethSendLibrary = await getLibraryAddress(ethSendUln)

                    graph = {
                        contracts: [
                            {
                                point: ethPoint,
                            },
                            {
                                point: avaxPoint,
                            },
                            {
                                point: bscPoint,
                            },
                        ],
                        connections: [
                            {
                                vector: { from: ethPoint, to: avaxPoint },
                                config: {
                                    sendConfig: {
                                        executorConfig: {
                                            maxMessageSize: 99,
                                            executor: avaxExecutorAddress,
                                        },
                                        ulnConfig: {
                                            confirmations: BigInt(42),
                                            requiredDVNs: ethToAvaxSendUlnDVNs,
                                            optionalDVNs: ethToAvaxSendUlnDVNs,
                                            optionalDVNThreshold: 1,
                                        },
                                    },
                                },
                            },
                            {
                                vector: { from: ethPoint, to: bscPoint },
                                config: {
                                    sendConfig: {
                                        executorConfig: {
                                            maxMessageSize: 99,
                                            executor: bscExecutorAddress,
                                        },
                                        ulnConfig: {
                                            confirmations: BigInt(42),
                                            requiredDVNs: ethToBscSendUlnDVNs,
                                            optionalDVNs: ethToBscSendUlnDVNs,
                                            optionalDVNThreshold: 1,
                                        },
                                    },
                                },
                            },
                            {
                                vector: { from: avaxPoint, to: ethPoint },
                                config: undefined,
                            },
                            {
                                vector: { from: avaxPoint, to: bscPoint },
                                config: undefined,
                            },
                            {
                                vector: { from: bscPoint, to: ethPoint },
                                config: undefined,
                            },
                            {
                                vector: { from: bscPoint, to: avaxPoint },
                                config: undefined,
                            },
                        ],
                    }
                })

                it('should return all configureSendConfig transactions', async () => {
                    transactions = await configureOApp(graph, oappSdkFactory)
                    const expectedTransactions = [
                        await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
                            ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: avaxExecutorAddress,
                                    },
                                },
                            ])),
                            ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethToAvaxSendUlnDVNs,
                                        optionalDVNs: ethToAvaxSendUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                            ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: bscExecutorAddress,
                                    },
                                },
                            ])),
                            ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethToBscSendUlnDVNs,
                                        optionalDVNs: ethToBscSendUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ]),
                    ]
                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should return one configureSendConfig transaction', async () => {
                    const [_, errors] = await signAndSend([
                        await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
                            ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: bscExecutorAddress,
                                    },
                                },
                            ])),
                            ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethToBscSendUlnDVNs,
                                        optionalDVNs: ethToBscSendUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ]),
                    ])
                    expect(errors).toEqual([])

                    // Now we configure the OApp
                    transactions = await configureOApp(graph, oappSdkFactory)
                    const expectedTransactions = [
                        await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
                            ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: avaxExecutorAddress,
                                    },
                                },
                            ])),
                            ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethToAvaxSendUlnDVNs,
                                        optionalDVNs: ethToAvaxSendUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ]),
                    ]
                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should not take the order of requiredDVNs into account', async () => {
                    const requiredDVNs = await Promise.all([
                        getLibraryAddress(avaxDvn),
                        getLibraryAddress(avaxDvn_Opt2),
                        getLibraryAddress(avaxDvn_Opt3),
                    ])

                    const config = {
                        sendConfig: {
                            executorConfig: {
                                maxMessageSize: 99,
                                executor: avaxExecutorAddress,
                            },
                            ulnConfig: {
                                confirmations: BigInt(42),
                                requiredDVNs,
                                optionalDVNs: [],
                                optionalDVNThreshold: 0,
                            },
                        },
                    }

                    const graph: OAppOmniGraph = {
                        contracts: [
                            {
                                point: ethPoint,
                            },
                            {
                                point: avaxPoint,
                            },
                        ],
                        connections: [
                            {
                                vector: { from: ethPoint, to: avaxPoint },
                                config,
                            },
                        ],
                    }

                    // First we configure the OApp with the original graph
                    const [_, errors] = await signAndSend(await configureOApp(graph, oappSdkFactory))
                    expect(errors).toEqual([])

                    // Now we change the order of the DVNs
                    const changedGraph: OAppOmniGraph = {
                        ...graph,
                        connections: [
                            {
                                vector: { from: ethPoint, to: avaxPoint },
                                config: {
                                    ...config,
                                    sendConfig: {
                                        ...config.sendConfig,
                                        ulnConfig: {
                                            ...config.sendConfig.ulnConfig,
                                            requiredDVNs: requiredDVNs.reverse(),
                                        },
                                    },
                                },
                            },
                        ],
                    }

                    // And this change should result in no change in the OApp
                    const transactions = await configureOApp(changedGraph, oappSdkFactory)
                    expect(transactions).toEqual([])
                })

                it('should not take the order of optionalDVNs into account', async () => {
                    const optionalDVNs = await Promise.all([
                        getLibraryAddress(avaxDvn),
                        getLibraryAddress(avaxDvn_Opt2),
                        getLibraryAddress(avaxDvn_Opt3),
                    ])

                    const config = {
                        sendConfig: {
                            executorConfig: {
                                maxMessageSize: 99,
                                executor: avaxExecutorAddress,
                            },
                            ulnConfig: {
                                confirmations: BigInt(42),
                                requiredDVNs: [],
                                optionalDVNs,
                                optionalDVNThreshold: 3,
                            },
                        },
                    }

                    const graph: OAppOmniGraph = {
                        contracts: [
                            {
                                point: ethPoint,
                            },
                            {
                                point: avaxPoint,
                            },
                        ],
                        connections: [
                            {
                                vector: { from: ethPoint, to: avaxPoint },
                                config,
                            },
                        ],
                    }

                    // First we configure the OApp with the original graph
                    const [_, errors] = await signAndSend(await configureOApp(graph, oappSdkFactory))
                    expect(errors).toEqual([])

                    // Now we change the order of the DVNs
                    const changedGraph: OAppOmniGraph = {
                        ...graph,
                        connections: [
                            {
                                vector: { from: ethPoint, to: avaxPoint },
                                config: {
                                    ...config,
                                    sendConfig: {
                                        ...config.sendConfig,
                                        ulnConfig: {
                                            ...config.sendConfig.ulnConfig,
                                            optionalDVNs: optionalDVNs.reverse(),
                                        },
                                    },
                                },
                            },
                        ],
                    }

                    // And this change should result in no change in the OApp
                    const transactions = await configureOApp(changedGraph, oappSdkFactory)
                    expect(transactions).toEqual([])
                })

                afterEach(async () => {
                    const [_, errors] = await signAndSend(transactions)
                    // eslint-disable-next-line jest/no-standalone-expect
                    expect(errors).toEqual([])
                    const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                    // eslint-disable-next-line jest/no-standalone-expect
                    expect(transactionsAgain).toEqual([])
                })
            })

            describe('configureReceiveConfig', () => {
                let graph: OAppOmniGraph, ethDvnAddress: string, ethReceiveUlnDVNs: string[], ethReceiveLibrary: string
                beforeEach(async () => {
                    ethDvnAddress = await getLibraryAddress(ethDvn)
                    ethReceiveUlnDVNs = [ethDvnAddress]
                    ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)

                    graph = {
                        contracts: [
                            {
                                point: ethPoint,
                            },
                            {
                                point: avaxPoint,
                            },
                            {
                                point: bscPoint,
                            },
                        ],
                        connections: [
                            {
                                vector: { from: ethPoint, to: avaxPoint },
                                config: {
                                    receiveConfig: {
                                        ulnConfig: {
                                            confirmations: BigInt(42),
                                            requiredDVNs: ethReceiveUlnDVNs,
                                            optionalDVNs: ethReceiveUlnDVNs,
                                            optionalDVNThreshold: 1,
                                        },
                                    },
                                },
                            },
                            {
                                vector: { from: ethPoint, to: bscPoint },
                                config: {
                                    receiveConfig: {
                                        ulnConfig: {
                                            confirmations: BigInt(24),
                                            requiredDVNs: ethReceiveUlnDVNs,
                                            optionalDVNs: ethReceiveUlnDVNs,
                                            optionalDVNThreshold: 1,
                                        },
                                    },
                                },
                            },
                            {
                                vector: { from: avaxPoint, to: ethPoint },
                                config: undefined,
                            },
                            {
                                vector: { from: avaxPoint, to: bscPoint },
                                config: undefined,
                            },
                            {
                                vector: { from: bscPoint, to: ethPoint },
                                config: undefined,
                            },
                            {
                                vector: { from: bscPoint, to: avaxPoint },
                                config: undefined,
                            },
                        ],
                    }
                })

                it('should return all configureReceiveConfig transactions', async () => {
                    // Now we configure the OApp
                    transactions = await configureOApp(graph, oappSdkFactory)
                    const expectedTransactions = [
                        await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                            ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                            ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(24),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ]),
                    ]
                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should return one configureReceiveConfig transactions', async () => {
                    const [_, errors] = await signAndSend([
                        await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                            ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ]),
                    ])
                    expect(errors).toEqual([])

                    // Now we configure the OApp
                    transactions = await configureOApp(graph, oappSdkFactory)
                    const expectedTransactions = [
                        await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                            ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(24),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            ])),
                        ]),
                    ]
                    expect(transactions).toEqual(expectedTransactions)
                })

                afterEach(async () => {
                    const [_, errors] = await signAndSend(transactions)
                    // eslint-disable-next-line jest/no-standalone-expect
                    expect(errors).toEqual([])
                    const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                    // eslint-disable-next-line jest/no-standalone-expect
                    expect(transactionsAgain).toEqual([])
                })
            })
        })

        describe('configureConfig configureSendConfig and configureReceiveConfig together', () => {
            let graph: OAppOmniGraph
            it('should return all setConfig transactions', async () => {
                const avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
                const avaxDvnAddress = await getLibraryAddress(avaxDvn)
                const ethSendUlnDVNs: string[] = [avaxDvnAddress]

                const ethDvnAddress = await getLibraryAddress(ethDvn)
                const ethReceiveUlnDVNs: string[] = [ethDvnAddress]

                const ethSendLibrary = await getLibraryAddress(ethSendUln)
                const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)

                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                sendConfig: {
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: avaxExecutorAddress,
                                    },
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethSendUlnDVNs,
                                        optionalDVNs: ethSendUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                                receiveConfig: {
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: undefined,
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: avaxExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: ethSendUlnDVNs,
                                    optionalDVNs: ethSendUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ]),
                    await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ]),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('setAll configs', () => {
            let graph: OAppOmniGraph
            it('should return all setConfig transactions', async () => {
                const avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
                const avaxDvnAddress = await getLibraryAddress(avaxDvn)
                const ethSendUlnDVNs: string[] = [avaxDvnAddress]

                const ethDvnAddress = await getLibraryAddress(ethDvn)
                const ethReceiveUlnDVNs: string[] = [ethDvnAddress]

                const ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
                const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
                const ethDefaultReceiveLibrary = await getLibraryAddress(ethReceiveUln)

                const createProvider = createProviderFactory()
                const ethProvider = await createProvider(EndpointId.ETHEREUM_V2_MAINNET)
                const latestEthBlock = (await ethProvider.getBlock('latest')).number
                const expiryEthBlock = BigInt(latestEthBlock + 1000)

                const [_, errors] = await signAndSend([
                    await ethEndpointSdk.registerLibrary(ethSendLibrary),
                    await ethEndpointSdk.registerLibrary(ethReceiveLibrary),
                ])
                expect(errors).toEqual([])

                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                sendLibrary: ethSendLibrary,
                                receiveLibraryConfig: {
                                    receiveLibrary: ethReceiveLibrary,
                                    gracePeriod: BigInt(0),
                                },
                                receiveLibraryTimeoutConfig: {
                                    lib: ethDefaultReceiveLibrary,
                                    expiry: expiryEthBlock,
                                },
                                sendConfig: {
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: avaxExecutorAddress,
                                    },
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethSendUlnDVNs,
                                        optionalDVNs: ethSendUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                                receiveConfig: {
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                },
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: undefined,
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                    await ethEndpointSdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                    await ethEndpointSdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    ),
                    await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: avaxExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: ethSendUlnDVNs,
                                    optionalDVNs: ethSendUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ]),
                    await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                            },
                        ])),
                    ]),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureEnforcedOptions', () => {
            let graph: OAppOmniGraph
            it('should return empty transactions when enforcedOptions is empty', async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                enforcedOptions: [],
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {
                                enforcedOptions: [],
                            },
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([])
            })
            it('should return all setEnforcedOption transactions', async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        options: '0x00030100110100000000000000000000000000030d40',
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        gas: '200000',
                                        value: '0',
                                    },
                                ],
                            },
                        },
                    ],
                }
                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            msgType: 1,
                            options: '0x00030100110100000000000000000000000000030d40',
                        },
                    ]),
                    await avaxOAppSdk.setEnforcedOptions([
                        {
                            eid: ethPoint.eid,
                            msgType: 1,
                            options: '0x00030100110100000000000000000000000000030d40',
                        },
                    ]),
                ])
            })

            it('should return one transactions when enforcedOptions', async () => {
                // This is the OApp config that we want to use against our contracts
                graph = {
                    contracts: [
                        {
                            point: ethPoint,
                        },
                        {
                            point: avaxPoint,
                        },
                    ],
                    connections: [
                        {
                            vector: { from: ethPoint, to: avaxPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        options: '0x00030100110100000000000000000000000000030d40',
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        gas: '200000',
                                        value: '0',
                                    },
                                ],
                            },
                        },
                    ],
                }

                const [_, errors] = await signAndSend([
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            msgType: 1,
                            options: '0x00030100110100000000000000000000000000030d40',
                        },
                    ]),
                ])
                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await avaxOAppSdk.setEnforcedOptions([
                        {
                            eid: ethPoint.eid,
                            msgType: 1,
                            options: '0x00030100110100000000000000000000000000030d40',
                        },
                    ]),
                ])
            })

            afterEach(async () => {
                const [_, errors] = await signAndSend(transactions)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(errors).toEqual([])
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })
    })
})
