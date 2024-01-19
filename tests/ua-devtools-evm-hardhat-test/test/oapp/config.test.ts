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
import { createSignAndSend, OmniPoint } from '@layerzerolabs/devtools'
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

            const transactions = await configureOApp(graph, oappSdkFactory)
            const expectedTransactions = [
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ]
            expect(transactions).toEqual(expectedTransactions)
        })
        it('should exclude setPeer transactions for peers that have been set', async () => {
            // Before we configure the OApp, we'll set some peers
            {
                const signerFactory = createSignerFactory()
                const ethSigner = await signerFactory(ethContract.eid)
                const ethTransaction = await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address)
                const ethResponse = await ethSigner.signAndSend(ethTransaction)
                const ethReceipt = await ethResponse.wait()
                expect(ethReceipt.from).toBe(await ethSigner.signer.getAddress())
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            // And expect the setPeer on the eth contact not to be there
            expect(transactions).toEqual([await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address)])
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
            await signAndSend([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ])
        })

        // describe('configureSendLibraries', () => {
        //     let ethSendLibrary: string, avaxSendLibrary: string, graph: OAppOmniGraph
        //     beforeEach(async () => {
        //         ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
        //         avaxSendLibrary = await getLibraryAddress(avaxSendUln2_Opt2)
        //         graph = {
        //             contracts: [
        //                 {
        //                     point: ethPoint,
        //                 },
        //                 {
        //                     point: avaxPoint,
        //                 },
        //             ],
        //             connections: [
        //                 {
        //                     vector: { from: ethPoint, to: avaxPoint },
        //                     config: {
        //                         sendLibrary: ethSendLibrary,
        //                     },
        //                 },
        //                 {
        //                     vector: { from: avaxPoint, to: ethPoint },
        //                     config: {
        //                         sendLibrary: avaxSendLibrary,
        //                     },
        //                 },
        //             ],
        //         }
        //     })
        //
        //     it('should configureSendLibraries transactions', async () => {
        //         // Now we configure the OApp
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //         expect(transactions).toEqual([
        //             await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
        //             await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
        //         ])
        //     })
        //     it('should return one configureSendLibraries transaction', async () => {
        //         // Before we configure the OApp, we'll register and set one of the send libraries
        //         {
        //             await signAndSend([
        //                 await ethEndpointSdk.registerLibrary(ethSendLibrary),
        //                 await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
        //             ])
        //         }
        //         // Now we configure the OApp
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //         expect(transactions).toEqual([
        //             await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
        //         ])
        //     })
        // })
        //
        // describe('configureReceiveLibraries', () => {
        //     let ethReceiveLibrary: string, avaxReceiveLibrary: string, graph: OAppOmniGraph
        //     beforeEach(async () => {
        //         ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
        //         avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln2_Opt2)
        //         graph = {
        //             contracts: [
        //                 {
        //                     point: ethPoint,
        //                 },
        //                 {
        //                     point: avaxPoint,
        //                 },
        //             ],
        //             connections: [
        //                 {
        //                     vector: { from: ethPoint, to: avaxPoint },
        //                     config: {
        //                         receiveLibraryConfig: {
        //                             receiveLibrary: ethReceiveLibrary,
        //                             gracePeriod: 0,
        //                         },
        //                     },
        //                 },
        //                 {
        //                     vector: { from: avaxPoint, to: ethPoint },
        //                     config: {
        //                         receiveLibraryConfig: {
        //                             receiveLibrary: avaxReceiveLibrary,
        //                             gracePeriod: 0,
        //                         },
        //                     },
        //                 },
        //             ],
        //         }
        //     })
        //
        //     it('should return all setPeer transactions and configureReceiveLibraries transactions', async () => {
        //         // Now we configure the OApp
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //         expect(transactions).toEqual([
        //             await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0),
        //             await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0),
        //         ])
        //     })
        //     it('should return all setPeer transactions and one configureReceiveLibraries transaction', async () => {
        //         // Before we configure the OApp, we'll register and set one of the receiving libraries
        //         {
        //             await signAndSend([
        //                 await ethEndpointSdk.registerLibrary(ethReceiveLibrary),
        //                 await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0),
        //             ])
        //         }
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //         expect(transactions).toEqual([
        //             await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0),
        //         ])
        //     })
        // })

        describe('configureReceiveLibraryTimeouts', () => {
            let ethDefaultReceiveLibrary: string,
                ethReceiveLibrary_Opt2: string,
                avaxDefaultReceiveLibrary: string,
                avaxReceiveLibrary_Opt2: string,
                graph: OAppOmniGraph,
                expiryEthBlock: number,
                expiryAvaxBlock: number
            beforeEach(async () => {
                ethDefaultReceiveLibrary = await getLibraryAddress(ethReceiveUln)
                ethReceiveLibrary_Opt2 = await getLibraryAddress(ethReceiveUln2_Opt2)

                avaxDefaultReceiveLibrary = await getLibraryAddress(avaxReceiveUln)
                avaxReceiveLibrary_Opt2 = await getLibraryAddress(avaxReceiveUln2_Opt2)

                const createProvider = createProviderFactory()
                const ethProvider = await createProvider(EndpointId.ETHEREUM_V2_MAINNET)
                const latestEthBlock = (await ethProvider.getBlock('latest')).number
                expiryEthBlock = latestEthBlock + 1000
                console.log({ latestEthBlock, expiryEthBlock })

                const avaxProvider = await createProvider(EndpointId.AVALANCHE_V2_MAINNET)
                const latestAvaxBlock = (await avaxProvider.getBlock('latest')).number
                expiryAvaxBlock = latestAvaxBlock + 1000
                console.log({ latestAvaxBlock, expiryAvaxBlock })

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
                                    gracePeriod: 0,
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
                                    gracePeriod: 0,
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
            // it('should return all configureReceiveLibraryTimeouts transactions', async () => {
            //     {
            //         await signAndSend([
            //             await ethEndpointSdk.registerLibrary(ethReceiveLibrary),
            //             await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0),
            //             await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary),
            //             await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0),
            //         ])
            //     }
            //
            //     // Now we configure the OApp
            //     const transactions = await configureOApp(graph, oappSdkFactory)
            //     expect(transactions).toEqual([
            //         await ethEndpointSdk.setReceiveLibraryTimeout(
            //             ethPoint.address,
            //             avaxPoint.eid,
            //             ethDefaultReceiveLibrary,
            //             42
            //         ),
            //         await avaxEndpointSdk.setReceiveLibraryTimeout(
            //             avaxPoint.address,
            //             ethPoint.eid,
            //             avaxDefaultReceiveLibrary,
            //             42
            //         ),
            //     ])
            // })

            it('should return one configureReceiveLibraryTimeouts transactions', async () => {
                {
                    await signAndSend([
                        await ethEndpointSdk.registerLibrary(ethReceiveLibrary_Opt2),
                        await ethEndpointSdk.setReceiveLibrary(
                            ethPoint.address,
                            avaxPoint.eid,
                            ethReceiveLibrary_Opt2,
                            0
                        ),
                        await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary_Opt2),
                        await avaxEndpointSdk.setReceiveLibrary(
                            avaxPoint.address,
                            ethPoint.eid,
                            avaxReceiveLibrary_Opt2,
                            0
                        ),
                    ])

                    const signerFactory = createSignerFactory()
                    const ethSigner = await signerFactory(ethContract.eid)
                    const ethTransaction = await ethEndpointSdk.setReceiveLibraryTimeout(
                        ethPoint.address,
                        avaxPoint.eid,
                        ethDefaultReceiveLibrary,
                        expiryEthBlock
                    )
                    const ethResponse = await ethSigner.signAndSend(ethTransaction)
                    const ethReceipt = await ethResponse.wait()
                    console.log({ ethReceipt })
                }

                // const ethResponse = await ethSigner.signAndSend(ethTransaction)
                // const ethReceipt = await ethResponse.wait()
                // expect(ethReceipt.from).toBe(await ethSigner.signer.getAddress())

                // Now we configure the OApp
                const transactions = await configureOApp(graph, oappSdkFactory)
                const expectedTransactions = [
                    await avaxEndpointSdk.setReceiveLibraryTimeout(
                        avaxPoint.address,
                        ethPoint.eid,
                        avaxDefaultReceiveLibrary,
                        expiryAvaxBlock
                    ),
                ]
                console.log({ transactions: JSON.stringify(transactions) })
                console.log({ expectedTransactions: JSON.stringify(expectedTransactions) })
                expect(transactions).toEqual(expectedTransactions)
            })
        })

        // describe('configureConfig', () => {
        //     let bscContract, bscPoint, bscOAppSdk
        //     beforeEach(async () => {
        //         bscContract = await contractFactory(bscPointHardhat)
        //         bscPoint = omniContractToPoint(bscContract)
        //         bscOAppSdk = await oappSdkFactory(bscPoint)
        //         // Before we configure the OApp, we'll set some peers
        //         {
        //             await signAndSend([
        //                 await ethOAppSdk.setPeer(bscPoint.eid, bscPoint.address),
        //                 await avaxOAppSdk.setPeer(bscPoint.eid, bscPoint.address),
        //                 await bscOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
        //                 await bscOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
        //             ])
        //         }
        //     })
        //     describe('configureSendConfig', () => {
        //         let graph: OAppOmniGraph,
        //             bscExecutorAddress: string,
        //             bscDvnAddress: string,
        //             avaxExecutorAddress: string,
        //             avaxDvnAddress: string,
        //             ethToAvaxSendUlnDVNs: string[],
        //             ethToBscSendUlnDVNs: string[],
        //             ethSendLibrary: string
        //         beforeEach(async () => {
        //             bscExecutorAddress = await getLibraryAddress(bscExecutor)
        //             bscDvnAddress = await getLibraryAddress(bscDvn)
        //
        //             avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
        //             avaxDvnAddress = await getLibraryAddress(avaxDvn)
        //
        //             ethToAvaxSendUlnDVNs = [avaxDvnAddress]
        //             ethToBscSendUlnDVNs = [bscDvnAddress]
        //             ethSendLibrary = await getLibraryAddress(ethSendUln)
        //             graph = {
        //                 contracts: [
        //                     {
        //                         point: ethPoint,
        //                     },
        //                     {
        //                         point: avaxPoint,
        //                     },
        //                     {
        //                         point: bscPoint,
        //                     },
        //                 ],
        //                 connections: [
        //                     {
        //                         vector: { from: ethPoint, to: avaxPoint },
        //                         config: {
        //                             sendConfig: {
        //                                 executorConfig: {
        //                                     maxMessageSize: 99,
        //                                     executor: avaxExecutorAddress,
        //                                 },
        //                                 ulnConfig: {
        //                                     confirmations: 42,
        //                                     requiredDVNs: ethToAvaxSendUlnDVNs,
        //                                     optionalDVNs: ethToAvaxSendUlnDVNs,
        //                                     optionalDVNThreshold: 0,
        //                                     requiredDVNCount: ethToAvaxSendUlnDVNs.length,
        //                                     optionalDVNCount: ethToAvaxSendUlnDVNs.length,
        //                                 },
        //                             },
        //                         },
        //                     },
        //                     {
        //                         vector: { from: ethPoint, to: bscPoint },
        //                         config: {
        //                             sendConfig: {
        //                                 executorConfig: {
        //                                     maxMessageSize: 99,
        //                                     executor: bscExecutorAddress,
        //                                 },
        //                                 ulnConfig: {
        //                                     confirmations: 42,
        //                                     requiredDVNs: ethToBscSendUlnDVNs,
        //                                     optionalDVNs: ethToBscSendUlnDVNs,
        //                                     optionalDVNThreshold: 0,
        //                                     requiredDVNCount: ethToBscSendUlnDVNs.length,
        //                                     optionalDVNCount: ethToBscSendUlnDVNs.length,
        //                                 },
        //                             },
        //                         },
        //                     },
        //                     {
        //                         vector: { from: avaxPoint, to: ethPoint },
        //                         config: undefined,
        //                     },
        //                     {
        //                         vector: { from: avaxPoint, to: bscPoint },
        //                         config: undefined,
        //                     },
        //                     {
        //                         vector: { from: bscPoint, to: ethPoint },
        //                         config: undefined,
        //                     },
        //                     {
        //                         vector: { from: bscPoint, to: avaxPoint },
        //                         config: undefined,
        //                     },
        //                 ],
        //             }
        //         })
        //
        //         it('should return all configureSendConfig transactions', async () => {
        //             const transactions = await configureOApp(graph, oappSdkFactory)
        //             const expectedTransactions = [
        //                 await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
        //                     ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
        //                         {
        //                             eid: avaxPoint.eid,
        //                             executorConfig: {
        //                                 maxMessageSize: 99,
        //                                 executor: avaxExecutorAddress,
        //                             },
        //                         },
        //                     ])),
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
        //                         {
        //                             eid: avaxPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethToAvaxSendUlnDVNs,
        //                                 optionalDVNs: ethToAvaxSendUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethToAvaxSendUlnDVNs.length,
        //                                 optionalDVNCount: ethToAvaxSendUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                     ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
        //                         {
        //                             eid: bscPoint.eid,
        //                             executorConfig: {
        //                                 maxMessageSize: 99,
        //                                 executor: bscExecutorAddress,
        //                             },
        //                         },
        //                     ])),
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
        //                         {
        //                             eid: bscPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethToBscSendUlnDVNs,
        //                                 optionalDVNs: ethToBscSendUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethToBscSendUlnDVNs.length,
        //                                 optionalDVNCount: ethToBscSendUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                 ]),
        //             ]
        //             expect(transactions).toEqual(expectedTransactions)
        //         })
        //
        //         it('should return one configureSendConfig transactions', async () => {
        //             {
        //                 await signAndSend([
        //                     await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
        //                         ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
        //                             {
        //                                 eid: bscPoint.eid,
        //                                 executorConfig: {
        //                                     maxMessageSize: 99,
        //                                     executor: bscExecutorAddress,
        //                                 },
        //                             },
        //                         ])),
        //                         ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
        //                             {
        //                                 eid: bscPoint.eid,
        //                                 ulnConfig: {
        //                                     confirmations: 42,
        //                                     requiredDVNs: ethToBscSendUlnDVNs,
        //                                     optionalDVNs: ethToBscSendUlnDVNs,
        //                                     optionalDVNThreshold: 0,
        //                                     requiredDVNCount: ethToBscSendUlnDVNs.length,
        //                                     optionalDVNCount: ethToBscSendUlnDVNs.length,
        //                                 },
        //                             },
        //                         ])),
        //                     ]),
        //                 ])
        //             }
        //
        //             // Now we configure the OApp
        //             const transactions = await configureOApp(graph, oappSdkFactory)
        //             const expectedTransactions = [
        //                 await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
        //                     ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
        //                         {
        //                             eid: avaxPoint.eid,
        //                             executorConfig: {
        //                                 maxMessageSize: 99,
        //                                 executor: avaxExecutorAddress,
        //                             },
        //                         },
        //                     ])),
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
        //                         {
        //                             eid: avaxPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethToAvaxSendUlnDVNs,
        //                                 optionalDVNs: ethToAvaxSendUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethToAvaxSendUlnDVNs.length,
        //                                 optionalDVNCount: ethToAvaxSendUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                 ]),
        //             ]
        //             console.log({ transactions: JSON.stringify(transactions) })
        //             console.log({ expectedTransactions: JSON.stringify(expectedTransactions) })
        //             expect(transactions).toEqual(expectedTransactions)
        //         })
        //     })
        //
        //     describe('configureReceiveConfig', () => {
        //         let graph: OAppOmniGraph, ethDvnAddress: string, ethReceiveUlnDVNs: string[], ethReceiveLibrary: string
        //         beforeEach(async () => {
        //             ethDvnAddress = await getLibraryAddress(ethDvn)
        //             ethReceiveUlnDVNs = [ethDvnAddress]
        //             ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)
        //             graph = {
        //                 contracts: [
        //                     {
        //                         point: ethPoint,
        //                     },
        //                     {
        //                         point: avaxPoint,
        //                     },
        //                     {
        //                         point: bscPoint,
        //                     },
        //                 ],
        //                 connections: [
        //                     {
        //                         vector: { from: ethPoint, to: avaxPoint },
        //                         config: {
        //                             receiveConfig: {
        //                                 ulnConfig: {
        //                                     confirmations: 42,
        //                                     requiredDVNs: ethReceiveUlnDVNs,
        //                                     optionalDVNs: ethReceiveUlnDVNs,
        //                                     optionalDVNThreshold: 0,
        //                                     requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                     optionalDVNCount: ethReceiveUlnDVNs.length,
        //                                 },
        //                             },
        //                         },
        //                     },
        //                     {
        //                         vector: { from: ethPoint, to: bscPoint },
        //                         config: {
        //                             receiveConfig: {
        //                                 ulnConfig: {
        //                                     confirmations: 24,
        //                                     requiredDVNs: ethReceiveUlnDVNs,
        //                                     optionalDVNs: ethReceiveUlnDVNs,
        //                                     optionalDVNThreshold: 0,
        //                                     requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                     optionalDVNCount: ethReceiveUlnDVNs.length,
        //                                 },
        //                             },
        //                         },
        //                     },
        //                     {
        //                         vector: { from: avaxPoint, to: ethPoint },
        //                         config: undefined,
        //                     },
        //                     {
        //                         vector: { from: avaxPoint, to: bscPoint },
        //                         config: undefined,
        //                     },
        //                     {
        //                         vector: { from: bscPoint, to: ethPoint },
        //                         config: undefined,
        //                     },
        //                     {
        //                         vector: { from: bscPoint, to: avaxPoint },
        //                         config: undefined,
        //                     },
        //                 ],
        //             }
        //         })
        //
        //         it('should return all configureReceiveConfig transactions', async () => {
        //             // Now we configure the OApp
        //             const transactions = await configureOApp(graph, oappSdkFactory)
        //             const expectedTransactions = [
        //                 await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
        //                         {
        //                             eid: avaxPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                 optionalDVNCount: ethReceiveUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
        //                         {
        //                             eid: bscPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 24,
        //                                 requiredDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                 optionalDVNCount: ethReceiveUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                 ]),
        //             ]
        //             expect(transactions).toEqual(expectedTransactions)
        //         })
        //
        //         it('should return one configureReceiveConfig transactions', async () => {
        //             {
        //                 await signAndSend([
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
        //                         {
        //                             eid: avaxPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                 optionalDVNCount: ethReceiveUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                 ])
        //             }
        //
        //             // Now we configure the OApp
        //             const transactions = await configureOApp(graph, oappSdkFactory)
        //             const expectedTransactions = [
        //                 await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
        //                     ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
        //                         {
        //                             eid: bscPoint.eid,
        //                             ulnConfig: {
        //                                 confirmations: 24,
        //                                 requiredDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                 optionalDVNCount: ethReceiveUlnDVNs.length,
        //                             },
        //                         },
        //                     ])),
        //                 ]),
        //             ]
        //             console.log({ transactions: JSON.stringify(transactions) })
        //             console.log({ expectedTransactions: JSON.stringify(expectedTransactions) })
        //             expect(transactions).toEqual(expectedTransactions)
        //         })
        //     })
        // })
        //
        // describe('configureSendConfig and configureReceiveConfig', () => {
        //     it('should return all setConfig transactions', async () => {
        //         const avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
        //         const avaxDvnAddress = await getLibraryAddress(avaxDvn)
        //         const ethSendUlnDVNs: string[] = [avaxDvnAddress]
        //
        //         const ethDvnAddress = await getLibraryAddress(ethDvn)
        //         const ethReceiveUlnDVNs: string[] = [ethDvnAddress]
        //
        //         const ethSendLibrary = await getLibraryAddress(ethSendUln)
        //         const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)
        //
        //         // This is the OApp config that we want to use against our contracts
        //         const graph: OAppOmniGraph = {
        //             contracts: [
        //                 {
        //                     point: ethPoint,
        //                 },
        //                 {
        //                     point: avaxPoint,
        //                 },
        //             ],
        //             connections: [
        //                 {
        //                     vector: { from: ethPoint, to: avaxPoint },
        //                     config: {
        //                         sendConfig: {
        //                             executorConfig: {
        //                                 maxMessageSize: 99,
        //                                 executor: avaxExecutorAddress,
        //                             },
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethSendUlnDVNs,
        //                                 optionalDVNs: ethSendUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethSendUlnDVNs.length,
        //                                 optionalDVNCount: ethSendUlnDVNs.length,
        //                             },
        //                         },
        //                         receiveConfig: {
        //                             ulnConfig: {
        //                                 confirmations: 42,
        //                                 requiredDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNs: ethReceiveUlnDVNs,
        //                                 optionalDVNThreshold: 0,
        //                                 requiredDVNCount: ethReceiveUlnDVNs.length,
        //                                 optionalDVNCount: ethReceiveUlnDVNs.length,
        //                             },
        //                         },
        //                     },
        //                 },
        //                 {
        //                     vector: { from: avaxPoint, to: ethPoint },
        //                     config: undefined,
        //                 },
        //             ],
        //         }
        //
        //         // Now we configure the OApp
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //         expect(transactions).toEqual([
        //             await ethEndpointSdk.setConfig(ethPoint.address, ethSendLibrary, [
        //                 ...(await ethEndpointSdk.getExecutorConfigParams(ethSendLibrary, [
        //                     {
        //                         eid: avaxPoint.eid,
        //                         executorConfig: {
        //                             maxMessageSize: 99,
        //                             executor: avaxExecutorAddress,
        //                         },
        //                     },
        //                 ])),
        //                 ...(await ethEndpointSdk.getUlnConfigParams(ethSendLibrary, [
        //                     {
        //                         eid: avaxPoint.eid,
        //                         ulnConfig: {
        //                             confirmations: 42,
        //                             requiredDVNs: ethSendUlnDVNs,
        //                             optionalDVNs: ethSendUlnDVNs,
        //                             optionalDVNThreshold: 0,
        //                             requiredDVNCount: ethSendUlnDVNs.length,
        //                             optionalDVNCount: ethSendUlnDVNs.length,
        //                         },
        //                     },
        //                 ])),
        //             ]),
        //             await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
        //                 ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
        //                     {
        //                         eid: avaxPoint.eid,
        //                         ulnConfig: {
        //                             confirmations: 42,
        //                             requiredDVNs: ethReceiveUlnDVNs,
        //                             optionalDVNs: ethReceiveUlnDVNs,
        //                             optionalDVNThreshold: 0,
        //                             requiredDVNCount: ethReceiveUlnDVNs.length,
        //                             optionalDVNCount: ethReceiveUlnDVNs.length,
        //                         },
        //                     },
        //                 ])),
        //             ]),
        //         ])
        //     })
        // })
        //
        // describe('configureEnforcedOptions', () => {
        //     it('should return empty transactions when enforcedOptions is empty', async () => {
        //         // This is the OApp config that we want to use against our contracts
        //         const graph: OAppOmniGraph = {
        //             contracts: [
        //                 {
        //                     point: ethPoint,
        //                 },
        //                 {
        //                     point: avaxPoint,
        //                 },
        //             ],
        //             connections: [
        //                 {
        //                     vector: { from: ethPoint, to: avaxPoint },
        //                     config: {
        //                         enforcedOptions: [],
        //                     },
        //                 },
        //                 {
        //                     vector: { from: avaxPoint, to: ethPoint },
        //                     config: {
        //                         enforcedOptions: [],
        //                     },
        //                 },
        //             ],
        //         }
        //
        //         // Now we configure the OApp
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //
        //         expect(transactions).toEqual([])
        //     })
        //     it('should return setEnforcedOption transactions when enforcedOptions are set', async () => {
        //         // This is the OApp config that we want to use against our contracts
        //         const graph: OAppOmniGraph = {
        //             contracts: [
        //                 {
        //                     point: ethPoint,
        //                 },
        //                 {
        //                     point: avaxPoint,
        //                 },
        //             ],
        //             connections: [
        //                 {
        //                     vector: { from: ethPoint, to: avaxPoint },
        //                     config: {
        //                         enforcedOptions: [
        //                             {
        //                                 msgType: 1,
        //                                 options: '0x00030100110100000000000000000000000000030d40',
        //                             },
        //                         ],
        //                     },
        //                 },
        //                 {
        //                     vector: { from: avaxPoint, to: ethPoint },
        //                     config: {
        //                         enforcedOptions: [
        //                             {
        //                                 msgType: 1,
        //                                 gas: '200000',
        //                                 value: '0',
        //                             },
        //                         ],
        //                     },
        //                 },
        //             ],
        //         }
        //         // Now we configure the OApp
        //         const transactions = await configureOApp(graph, oappSdkFactory)
        //         expect(transactions).toEqual([
        //             await ethOAppSdk.setEnforcedOptions([
        //                 {
        //                     eid: avaxPoint.eid,
        //                     msgType: 1,
        //                     options: '0x00030100110100000000000000000000000000030d40',
        //                 },
        //             ]),
        //             await avaxOAppSdk.setEnforcedOptions([
        //                 {
        //                     eid: ethPoint.eid,
        //                     msgType: 1,
        //                     options: '0x00030100110100000000000000000000000000030d40',
        //                 },
        //             ]),
        //         ])
        //     })
        // })
    })
})
