import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    createConnectedContractFactory,
    createProviderFactory,
    createSignerFactory,
    OmniContractFactoryHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    configureOApp,
    configureOAppDelegates,
    configureCallerBpsCap,
    IOApp,
    OAppFactory,
    OAppOmniGraph,
} from '@layerzerolabs/ua-devtools'
import { OmniContract, omniContractToPoint } from '@layerzerolabs/devtools-evm'
import {
    avaxReceiveUln,
    avaxReceiveUln2_Opt2,
    avaxSendUln,
    avaxSendUln2_Opt2,
    setupDefaultEndpointV2,
    deployContract,
    ethDvn,
    ethDvn_Opt2,
    ethDvn_Opt3,
    ethExecutor,
    ethReceiveUln,
    ethReceiveUln2_Opt2,
    ethSendUln,
    ethSendUln2_Opt2,
    getLibraryAddress,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { createSignAndSend, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { IEndpointV2, Uln302ConfigType } from '@layerzerolabs/protocol-devtools'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

describe('oapp/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }
    const bscPointHardhat = { eid: EndpointId.BSC_V2_MAINNET, contractName: 'CustomOApp' }

    let contractFactory: OmniContractFactoryHardhat
    let signAndSend
    let oappSdkFactory: OAppFactory

    let ethContract: OmniContract
    let ethPoint: OmniPoint
    let ethOAppSdk: IOApp
    let ethEndpointV2Sdk: IEndpointV2

    let avaxContract: OmniContract
    let avaxPoint: OmniPoint
    let avaxOAppSdk: IOApp
    let avaxEndpointV2Sdk: IEndpointV2

    let bscContract: OmniContract
    let bscPoint: OmniPoint
    let bscOAppSdk: IOApp

    let transactions: OmniTransaction[]

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
        await deployContract('OApp')

        contractFactory = createConnectedContractFactory()
        signAndSend = createSignAndSend(createSignerFactory())
        oappSdkFactory = createOAppFactory(contractFactory)

        ethContract = await contractFactory(ethPointHardhat)
        avaxContract = await contractFactory(avaxPointHardhat)
        bscContract = await contractFactory(bscPointHardhat)

        ethPoint = omniContractToPoint(ethContract)
        ethOAppSdk = await oappSdkFactory(ethPoint)

        avaxPoint = omniContractToPoint(avaxContract)
        avaxOAppSdk = await oappSdkFactory(avaxPoint)

        bscPoint = omniContractToPoint(bscContract)
        bscOAppSdk = await oappSdkFactory(bscPoint)

        ethEndpointV2Sdk = await ethOAppSdk.getEndpointSDK()
        avaxEndpointV2Sdk = await avaxOAppSdk.getEndpointSDK()
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

    describe('configureOAppDelegates', () => {
        it('should not return any transactions if configs are undefined', async () => {
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: undefined,
                    },
                    {
                        point: ethPoint,
                        config: undefined,
                    },
                ],
                connections: [],
            }

            expect(await configureOAppDelegates(graph, oappSdkFactory)).toEqual([])
        })

        it('should not return any transactions if delegates are undefined', async () => {
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            delegate: undefined,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            delegate: undefined,
                        },
                    },
                ],
                connections: [],
            }

            expect(await configureOAppDelegates(graph, oappSdkFactory)).toEqual([])
        })

        it('should return all setDelegate transactions if owners are specified', async () => {
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            delegate: ethPoint.address,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            delegate: avaxPoint.address,
                        },
                    },
                ],
                connections: [],
            }

            expect(await configureOAppDelegates(graph, oappSdkFactory)).toEqual([
                await avaxOAppSdk.setDelegate(ethPoint.address),
                await ethOAppSdk.setDelegate(avaxPoint.address),
            ])
        })

        it('should not set delegates that have already been set', async () => {
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            delegate: ethPoint.address,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            delegate: avaxPoint.address,
                        },
                    },
                ],
                connections: [],
            }

            const signAndSend = createSignAndSend(createSignerFactory())
            await signAndSend([await avaxOAppSdk.setDelegate(ethPoint.address)])

            expect(await configureOAppDelegates(graph, oappSdkFactory)).toEqual([
                await ethOAppSdk.setDelegate(avaxPoint.address),
            ])
        })

        it('should not produce any transactions if ran again', async () => {
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            delegate: ethPoint.address,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            delegate: avaxPoint.address,
                        },
                    },
                ],
                connections: [],
            }

            const signAndSend = createSignAndSend(createSignerFactory())
            await signAndSend(await configureOAppDelegates(graph, oappSdkFactory))

            expect(await configureOAppDelegates(graph, oappSdkFactory)).toEqual([])
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

        describe('configureSendLibraries lock defaults', () => {
            let ethSendLibrary: string, avaxSendLibrary: string, graph: OAppOmniGraph
            beforeEach(async () => {
                ethSendLibrary = await getLibraryAddress(ethSendUln)
                avaxSendLibrary = await getLibraryAddress(avaxSendUln)
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

            it('should lock in default configureSendLibraries transactions', async () => {
                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                    await avaxEndpointV2Sdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
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

        describe('configureSendLibraries', () => {
            let ethSendLibrary: string, avaxSendLibrary: string, graph: OAppOmniGraph
            beforeEach(async () => {
                ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
                avaxSendLibrary = await getLibraryAddress(avaxSendUln2_Opt2)
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.registerLibrary(ethSendLibrary),
                    await avaxEndpointV2Sdk.registerLibrary(avaxSendLibrary),
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
                    await ethEndpointV2Sdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                    await avaxEndpointV2Sdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
                ])
            })

            it('should return one configureSendLibraries transaction', async () => {
                // Before we configure the OApp, we'll register and set one of the send libraries
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                ])
                expect(errors).toEqual([])

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await avaxEndpointV2Sdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
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

        describe('configureReceiveLibraries lock defaults', () => {
            let ethReceiveLibrary: string, avaxReceiveLibrary: string, graph: OAppOmniGraph
            beforeEach(async () => {
                ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)
                avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln)
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

            it('should return all lock in configureReceiveLibraries transactions', async () => {
                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
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
        describe('configureReceiveLibraries', () => {
            let ethReceiveLibrary: string, avaxReceiveLibrary: string, graph: OAppOmniGraph
            beforeEach(async () => {
                ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
                avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln2_Opt2)
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.registerLibrary(ethReceiveLibrary),
                    await avaxEndpointV2Sdk.registerLibrary(avaxReceiveLibrary),
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
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
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
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                ])
                expect(errors).toEqual([])

                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await avaxEndpointV2Sdk.setReceiveLibrary(
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
                    await ethEndpointV2Sdk.registerLibrary(ethReceiveLibrary_Opt2),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.registerLibrary(avaxReceiveLibrary_Opt2),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
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
                    await ethEndpointV2Sdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    ),
                    await avaxEndpointV2Sdk.setReceiveLibraryTimeout(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxDefaultReceiveLibrary,
                        expiryAvaxBlock
                    ),
                ])
            })

            it('should return one configureReceiveLibraryTimeouts transactions', async () => {
                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.registerLibrary(ethReceiveLibrary_Opt2),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                    await avaxEndpointV2Sdk.registerLibrary(avaxReceiveLibrary_Opt2),
                    await avaxEndpointV2Sdk.setReceiveLibrary(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxReceiveLibrary_Opt2,
                        BigInt(0)
                    ),
                    await ethEndpointV2Sdk.setReceiveLibraryTimeout(
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
                    await avaxEndpointV2Sdk.setReceiveLibraryTimeout(
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
            beforeEach(async () => {
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
                let graph: OAppOmniGraph, ethExecutorAddress: string, ethDvnAddress: string, ethSendLibrary: string

                beforeEach(async () => {
                    ethExecutorAddress = await getLibraryAddress(ethExecutor)
                    ethDvnAddress = await getLibraryAddress(ethDvn)
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
                                            executor: ethExecutorAddress,
                                        },
                                        ulnConfig: {
                                            confirmations: BigInt(42),
                                            requiredDVNs: [ethDvnAddress],
                                            optionalDVNs: [ethDvnAddress],
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
                                            executor: ethExecutorAddress,
                                        },
                                        ulnConfig: {
                                            confirmations: BigInt(42),
                                            requiredDVNs: [ethDvnAddress],
                                            optionalDVNs: [ethDvnAddress],
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
                    const expectedTransactions = await ethEndpointV2Sdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: ethExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Send,
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: bscPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: ethExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: bscPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Send,
                            },
                        ])),
                    ])
                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should return one configureSendConfig transaction', async () => {
                    const [_, errors] = await signAndSend(
                        await ethEndpointV2Sdk.setConfig(ethPoint.address, ethSendLibrary, [
                            ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    executorConfig: {
                                        maxMessageSize: 99,
                                        executor: ethExecutorAddress,
                                    },
                                },
                            ])),
                            ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                                {
                                    eid: bscPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                    type: Uln302ConfigType.Send,
                                },
                            ])),
                        ])
                    )
                    expect(errors).toEqual([])

                    // Now we configure the OApp
                    transactions = await configureOApp(graph, oappSdkFactory)
                    const expectedTransactions = await ethEndpointV2Sdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: ethExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Send,
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

                    const config = {
                        sendConfig: {
                            executorConfig: {
                                maxMessageSize: 99,
                                executor: ethExecutorAddress,
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
                        getLibraryAddress(ethDvn),
                        getLibraryAddress(ethDvn_Opt2),
                        getLibraryAddress(ethDvn_Opt3),
                    ])

                    const config = {
                        sendConfig: {
                            executorConfig: {
                                maxMessageSize: 99,
                                executor: ethExecutorAddress,
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
                    const expectedTransactions = await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Receive,
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: bscPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(24),
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Receive,
                            },
                        ])),
                    ])

                    expect(transactions).toEqual(expectedTransactions)
                })

                it('should return one configureReceiveConfig transactions', async () => {
                    const [_, errors] = await signAndSend(
                        await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                            ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                                {
                                    eid: avaxPoint.eid,
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: ethReceiveUlnDVNs,
                                        optionalDVNs: ethReceiveUlnDVNs,
                                        optionalDVNThreshold: 1,
                                    },
                                    type: Uln302ConfigType.Receive,
                                },
                            ])),
                        ])
                    )
                    expect(errors).toEqual([])

                    // Now we configure the OApp
                    transactions = await configureOApp(graph, oappSdkFactory)
                    const expectedTransactions = await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: bscPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(24),
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Receive,
                            },
                        ])),
                    ])

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
                const ethSendLibrary = await getLibraryAddress(ethSendUln)
                const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)

                const ethExecutorAddress = await getLibraryAddress(ethExecutor)
                const ethDvnAddress = await getLibraryAddress(ethDvn)

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
                                        executor: ethExecutorAddress,
                                    },
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                },
                                receiveConfig: {
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
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
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: ethExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Send,
                            },
                        ])),
                    ])),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Receive,
                            },
                        ])),
                    ])),
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
                const ethExecutorAddress = await getLibraryAddress(ethExecutor)
                const ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
                const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
                const ethDefaultReceiveLibrary = await getLibraryAddress(ethReceiveUln)
                const ethDvnAddress = await getLibraryAddress(ethDvn)

                const createProvider = createProviderFactory()
                const ethProvider = await createProvider(EndpointId.ETHEREUM_V2_MAINNET)
                const latestEthBlock = (await ethProvider.getBlock('latest')).number
                const expiryEthBlock = BigInt(latestEthBlock + 1000)

                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.registerLibrary(ethSendLibrary),
                    await ethEndpointV2Sdk.registerLibrary(ethReceiveLibrary),
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
                                        executor: ethExecutorAddress,
                                    },
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                },
                                receiveConfig: {
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
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
                    await ethEndpointV2Sdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                    await ethEndpointV2Sdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    ),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: ethExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Send,
                            },
                        ])),
                    ])),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Receive,
                            },
                        ])),
                    ])),
                ])
            })

            it('should return all setConfig transactions in parallel mode', async () => {
                const ethExecutorAddress = await getLibraryAddress(ethExecutor)
                const ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
                const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
                const ethDefaultReceiveLibrary = await getLibraryAddress(ethReceiveUln)
                const ethDvnAddress = await getLibraryAddress(ethDvn)

                const createProvider = createProviderFactory()
                const ethProvider = await createProvider(EndpointId.ETHEREUM_V2_MAINNET)
                const latestEthBlock = (await ethProvider.getBlock('latest')).number
                const expiryEthBlock = BigInt(latestEthBlock + 1000)

                const [_, errors] = await signAndSend([
                    await ethEndpointV2Sdk.registerLibrary(ethSendLibrary),
                    await ethEndpointV2Sdk.registerLibrary(ethReceiveLibrary),
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
                                        executor: ethExecutorAddress,
                                    },
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
                                        optionalDVNThreshold: 1,
                                    },
                                },
                                receiveConfig: {
                                    ulnConfig: {
                                        confirmations: BigInt(42),
                                        requiredDVNs: [ethDvnAddress],
                                        optionalDVNs: [ethDvnAddress],
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

                // We set the mode to parallel
                process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = '1'

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                expect(transactions).toEqual([
                    await ethEndpointV2Sdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                    await ethEndpointV2Sdk.setReceiveLibrary(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethReceiveLibrary,
                        BigInt(0)
                    ),
                    await ethEndpointV2Sdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    ),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethSendLibrary, [
                        ...(await ethEndpointV2Sdk.getExecutorConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: ethExecutorAddress,
                                },
                            },
                        ])),
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethSendLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Send,
                            },
                        ])),
                    ])),
                    ...(await ethEndpointV2Sdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                        ...(await ethEndpointV2Sdk.getUlnConfigParams(ethReceiveLibrary, [
                            {
                                eid: avaxPoint.eid,
                                ulnConfig: {
                                    confirmations: BigInt(42),
                                    requiredDVNs: [ethDvnAddress],
                                    optionalDVNs: [ethDvnAddress],
                                    optionalDVNThreshold: 1,
                                },
                                type: Uln302ConfigType.Receive,
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
                const transactionsAgain = await configureOApp(graph, oappSdkFactory)
                // eslint-disable-next-line jest/no-standalone-expect
                expect(transactionsAgain).toEqual([])
            })
        })

        describe('configureEnforcedOptions', () => {
            let graph: OAppOmniGraph

            beforeEach(async () => {
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

            it("should return addExecutorLzReceiveOption tx's in both directions for msgType: 1", async () => {
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
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '200000',
                                        value: '0',
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
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
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
                const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toLowerCase()
                expect(transactions).toEqual([
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                    await avaxOAppSdk.setEnforcedOptions([
                        {
                            eid: ethPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ])
            })

            it("should combine addExecutorLzReceiveOption's into one tx for both chains for msgType: 1", async () => {
                // This is the OApp config that we want to use against our contracts
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
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '200000',
                                        value: '0',
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: ethPoint, to: bscPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
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
                const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toLowerCase()
                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                        {
                            eid: bscPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine addExecutorLzReceiveOption settings for one chain into one transaction for msgType: 1', async () => {
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
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '250000',
                                        value: '0',
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '550000',
                                        value: '2',
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {},
                        },
                    ],
                }
                const options = Options.newOptions()
                    .addExecutorLzReceiveOption(250000, 0)
                    .addExecutorLzReceiveOption(550000, 2)
                    .toHex()
                    .toLowerCase()

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine diff option types (LZ_RECEIVE & NATIVE_DROP) for msgType: 1 and one option type (NATIVE_DROP) for msgType: 2 w/ multiple chains', async () => {
                // This is the OApp config that we want to use against our contracts
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
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '250000',
                                        value: '0',
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.NATIVE_DROP,
                                        amount: 1,
                                        receiver: '0x0000000000000000000000000000000000000001',
                                    },
                                    {
                                        msgType: 2,
                                        optionType: ExecutorOptionType.NATIVE_DROP,
                                        amount: 2,
                                        receiver: '0x0000000000000000000000000000000000000002',
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: ethPoint, to: bscPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 2,
                                        optionType: ExecutorOptionType.NATIVE_DROP,
                                        amount: 1,
                                        receiver: '0x0000000000000000000000000000000000000003',
                                    },
                                ],
                            },
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)

                const avaxOptionsMsgType1 = Options.newOptions()
                    .addExecutorLzReceiveOption(250000, 0)
                    .addExecutorNativeDropOption(1, '0x0000000000000000000000000000000000000001')
                    .toHex()
                    .toLowerCase()

                const avaxOptionsMsgType2 = Options.newOptions()
                    .addExecutorNativeDropOption(2, '0x0000000000000000000000000000000000000002')
                    .toHex()
                    .toLowerCase()

                const bscOptionsMsgType2 = Options.newOptions()
                    .addExecutorNativeDropOption(1, '0x0000000000000000000000000000000000000003')
                    .toHex()
                    .toLowerCase()

                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: avaxOptionsMsgType1,
                            },
                        },
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 2,
                                options: avaxOptionsMsgType2,
                            },
                        },
                        {
                            eid: bscPoint.eid,
                            option: {
                                msgType: 2,
                                options: bscOptionsMsgType2,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine addExecutorComposeOption settings into one transaction for msgType: 1', async () => {
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
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 0,
                                        gas: 200000,
                                        value: 1,
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 1,
                                        gas: 200500,
                                        value: 0,
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 2,
                                        gas: 300000,
                                        value: 2,
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 3,
                                        gas: 100000,
                                        value: 0,
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {},
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                const options = Options.newOptions()
                    .addExecutorComposeOption(0, 200000, 1)
                    .addExecutorComposeOption(1, 200500, 0)
                    .addExecutorComposeOption(2, 300000, 2)
                    .addExecutorComposeOption(3, 100000, 0)
                    .toHex()
                    .toLowerCase()
                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine addExecutorComposeOption settings for two chains into one transaction for two different msgTypes (1 & 2)', async () => {
                // This is the OApp config that we want to use against our contracts
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
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 0,
                                        gas: 200000,
                                        value: 1,
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 1,
                                        gas: 200500,
                                        value: 0,
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: ethPoint, to: bscPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 2,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 0,
                                        gas: 300000,
                                        value: 0,
                                    },
                                    {
                                        msgType: 2,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 1,
                                        gas: 200005,
                                        value: 1,
                                    },
                                ],
                            },
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)

                const avaxOptionsMsgType1 = Options.newOptions()
                    .addExecutorComposeOption(0, 200000, 1)
                    .addExecutorComposeOption(1, 200500, 0)
                    .toHex()
                    .toLowerCase()

                const bscOptionsMsgType2 = Options.newOptions()
                    .addExecutorComposeOption(0, 300000, 0)
                    .addExecutorComposeOption(1, 200005, 1)
                    .toHex()
                    .toLowerCase()

                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: avaxOptionsMsgType1,
                            },
                        },
                        {
                            eid: bscPoint.eid,
                            option: {
                                msgType: 2,
                                options: bscOptionsMsgType2,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine addExecutorLzReceiveOption, addExecutorNativeDropOption, and addExecutorComposeOption settings for two chains when applicable', async () => {
                // This is the OApp config that we want to use against our contracts
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
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '250000',
                                        value: '0',
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.NATIVE_DROP,
                                        amount: 1,
                                        receiver: '0x0000000000000000000000000000000000000001',
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.NATIVE_DROP,
                                        amount: 2,
                                        receiver: '0x000000000000000000000000000000000000002',
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 0,
                                        gas: 200000,
                                        value: 1,
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 1,
                                        gas: 200500,
                                        value: 0,
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 2,
                                        gas: 300000,
                                        value: 2,
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: ethPoint, to: bscPoint },
                            config: {
                                enforcedOptions: [
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '300000',
                                        value: '1',
                                    },
                                    {
                                        msgType: 2,
                                        optionType: ExecutorOptionType.NATIVE_DROP,
                                        amount: 3,
                                        receiver: '0x000000000000000000000000000000000000001',
                                    },
                                    {
                                        msgType: 3,
                                        optionType: ExecutorOptionType.COMPOSE,
                                        index: 0,
                                        gas: 100000,
                                        value: 0,
                                    },
                                ],
                            },
                        },
                    ],
                }

                const avaxOptionsMsgType1 = Options.newOptions()
                    .addExecutorLzReceiveOption(250000, 0)
                    .addExecutorNativeDropOption(1, '0x0000000000000000000000000000000000000001')
                    .addExecutorNativeDropOption(2, '0x0000000000000000000000000000000000000002')
                    .addExecutorComposeOption(0, 200000, 1)
                    .addExecutorComposeOption(1, 200500, 0)
                    .addExecutorComposeOption(2, 300000, 2)
                    .toHex()
                    .toLowerCase()

                const bscOptionsMsgType1 = Options.newOptions()
                    .addExecutorLzReceiveOption(300000, 1)
                    .toHex()
                    .toLowerCase()

                const bscOptionsMsgType2 = Options.newOptions()
                    .addExecutorNativeDropOption(3, '0x0000000000000000000000000000000000000001')
                    .toHex()
                    .toLowerCase()

                const bscOptionsMsgType3 = Options.newOptions()
                    .addExecutorComposeOption(0, 100000, 0)
                    .toHex()
                    .toLowerCase()

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: avaxOptionsMsgType1,
                            },
                        },
                        {
                            eid: bscPoint.eid,
                            option: {
                                msgType: 1,
                                options: bscOptionsMsgType1,
                            },
                        },
                        {
                            eid: bscPoint.eid,
                            option: {
                                msgType: 2,
                                options: bscOptionsMsgType2,
                            },
                        },
                        {
                            eid: bscPoint.eid,
                            option: {
                                msgType: 3,
                                options: bscOptionsMsgType3,
                            },
                        },
                    ]),
                ]
                expect(transactions).toEqual(expectedTransactions)
            })

            it('should combine addExecutorLzReceiveOption & addExecutorOrderedExecutionOption into one transaction for msgType: 1', async () => {
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
                                        optionType: ExecutorOptionType.LZ_RECEIVE,
                                        gas: '225000',
                                        value: '0',
                                    },
                                    {
                                        msgType: 1,
                                        optionType: ExecutorOptionType.ORDERED,
                                    },
                                ],
                            },
                        },
                        {
                            vector: { from: avaxPoint, to: ethPoint },
                            config: {},
                        },
                    ],
                }

                // Now we configure the OApp
                transactions = await configureOApp(graph, oappSdkFactory)
                const options = Options.newOptions()
                    .addExecutorLzReceiveOption(225000, 0)
                    .addExecutorOrderedExecutionOption()
                    .toHex()
                    .toLowerCase()

                const expectedTransactions = [
                    await ethOAppSdk.setEnforcedOptions([
                        {
                            eid: avaxPoint.eid,
                            option: {
                                msgType: 1,
                                options: options,
                            },
                        },
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

        describe('configureCallerBpsCap', () => {
            it('should not return any transactions if configs are undefined', async () => {
                const graph: OAppOmniGraph = {
                    contracts: [
                        {
                            point: avaxPoint,
                            config: undefined,
                        },
                        {
                            point: ethPoint,
                            config: undefined,
                        },
                    ],
                    connections: [],
                }

                expect(await configureCallerBpsCap(graph, oappSdkFactory)).toEqual([])
            })

            it('should not return any transactions if callerBpsCap is undefined', async () => {
                const graph: OAppOmniGraph = {
                    contracts: [
                        {
                            point: avaxPoint,
                            config: {
                                callerBpsCap: undefined,
                            },
                        },
                        {
                            point: ethPoint,
                            config: {
                                callerBpsCap: undefined,
                            },
                        },
                    ],
                    connections: [],
                }

                expect(await configureCallerBpsCap(graph, oappSdkFactory)).toEqual([])
            })

            it('should not set callerBpsCap that has already been set', async () => {
                const avaxCallerBpsCap = BigInt(100)
                const graph: OAppOmniGraph = {
                    contracts: [
                        {
                            point: avaxPoint,
                            config: {
                                callerBpsCap: avaxCallerBpsCap,
                            },
                        },
                    ],
                    connections: [],
                }

                const signAndSend = createSignAndSend(createSignerFactory())
                await signAndSend([(await avaxOAppSdk.setCallerBpsCap(avaxCallerBpsCap)) as OmniTransaction])
                expect(await avaxOAppSdk.getCallerBpsCap()).toBe(avaxCallerBpsCap)

                expect(await configureCallerBpsCap(graph, oappSdkFactory)).toEqual([])
            })

            it('should return no transactions if setCallerBpsCap function does not exist', async () => {
                const graph: OAppOmniGraph = {
                    contracts: [
                        {
                            point: bscPoint,
                            config: {
                                callerBpsCap: BigInt(100),
                            },
                        },
                    ],
                    connections: [],
                }

                expect(await configureCallerBpsCap(graph, oappSdkFactory)).toEqual([])
            })

            it('should return all setCallerBpsCap transactions if callerBpsCap is specified', async () => {
                const avaxCallerBpsCap = BigInt(100)
                const ethCallerBpsCap = BigInt(300)
                const graph: OAppOmniGraph = {
                    contracts: [
                        {
                            point: avaxPoint,
                            config: {
                                callerBpsCap: avaxCallerBpsCap,
                            },
                        },
                        {
                            point: ethPoint,
                            config: {
                                callerBpsCap: ethCallerBpsCap,
                            },
                        },
                    ],
                    connections: [],
                }

                expect(await configureCallerBpsCap(graph, oappSdkFactory)).toEqual([
                    await avaxOAppSdk.setCallerBpsCap(avaxCallerBpsCap),
                    await ethOAppSdk.setCallerBpsCap(ethCallerBpsCap),
                ])

                /**
                 * Now we'll check if the callerBpsCap has been set correctly after above transactions are signed and sent
                 */
                const signAndSend = createSignAndSend(createSignerFactory())
                await signAndSend([(await avaxOAppSdk.setCallerBpsCap(avaxCallerBpsCap)) as OmniTransaction])
                expect(await avaxOAppSdk.getCallerBpsCap()).toBe(avaxCallerBpsCap)

                await signAndSend([(await ethOAppSdk.setCallerBpsCap(ethCallerBpsCap)) as OmniTransaction])
                expect(await ethOAppSdk.getCallerBpsCap()).toBe(ethCallerBpsCap)
            })
        })
    })

    describe('configureOAppPeers with Solana', () => {
        it('should set the peers', async () => {
            const solanaPoint: OmniPoint = {
                eid: EndpointId.SOLANA_V2_MAINNET,
                address: 'Ag28jYmND83RnwcSFq2vwWxThSya55etjWJwubd8tRXs',
            }
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: avaxPoint, to: solanaPoint },
                    },
                ],
            }

            const transactions = await configureOApp(graph, oappSdkFactory)
            const expectedTransactions = [await avaxOAppSdk.setPeer(solanaPoint.eid, solanaPoint.address)]
            expect(transactions).toEqual(expectedTransactions)

            const signAndSend = createSignAndSend(createSignerFactory())
            await signAndSend(transactions)

            expect(await configureOApp(graph, oappSdkFactory)).toEqual([])
        })
    })
})
