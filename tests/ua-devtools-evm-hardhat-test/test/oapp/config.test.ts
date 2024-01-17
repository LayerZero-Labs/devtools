import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deployOApp } from '../__utils__/oapp'
import {
    OmniContractFactoryHardhat,
    createConnectedContractFactory,
    createSignerFactory,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOApp, OAppFactory, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
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

describe('oapp/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }

    let contractFactory: OmniContractFactoryHardhat
    let oappSdkFactory: OAppFactory

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployEndpoint()
        await setupDefaultEndpoint()
        await deployOApp()

        contractFactory = createConnectedContractFactory()
        oappSdkFactory = createOAppFactory(contractFactory)
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
    })

    describe('configureOAppPeers', () => {
        it('should return all setPeer transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
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
                        config: undefined,
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: undefined,
                    },
                ],
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ])
        })
        it('should exclude setPeer transactions for peers that have been set', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
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
                        config: undefined,
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: undefined,
                    },
                ],
            }

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

    describe('configureSendLibraries', () => {
        it('should return all setPeer transactions and configureSendLibraries transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)
            const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

            const ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
            const avaxSendLibrary = await getLibraryAddress(avaxSendUln2_Opt2)

            // This is the OApp config that we want to use against our contracts
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

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary),
                await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
            ])
        })
        it('should return all setPeer transactions and one configureSendLibraries transaction', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)
            const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

            const ethSendLibrary = await getLibraryAddress(ethSendUln2_Opt2)
            const avaxSendLibrary = await getLibraryAddress(avaxSendUln2_Opt2)

            // This is the OApp config that we want to use against our contracts
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

            {
                const signerFactory = createSignerFactory()
                // register new Send ULNs on ETH
                const ethSigner = await signerFactory(ethContract.eid)
                await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethSendLibrary))
                await ethSigner.signAndSend(
                    await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary)
                )
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
            ])
        })
    })

    describe('configureReceiveLibraries', () => {
        it('should return all setPeer transactions and configureReceiveLibraries transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)
            const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

            const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
            const avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln2_Opt2)

            // This is the OApp config that we want to use against our contracts
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
                        config: {
                            receiveLibraryConfig: {
                                receiveLibrary: ethReceiveLibrary,
                                gracePeriod: 0,
                            },
                        },
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: {
                            receiveLibraryConfig: {
                                receiveLibrary: avaxReceiveLibrary,
                                gracePeriod: 0,
                            },
                        },
                    },
                ],
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0),
                await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0),
            ])
        })
        it('should return all setPeer transactions and one configureReceiveLibraries transaction', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)
            const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

            const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)
            const avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln2_Opt2)

            // This is the OApp config that we want to use against our contracts
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
                        config: {
                            receiveLibraryConfig: {
                                receiveLibrary: ethReceiveLibrary,
                                gracePeriod: 0,
                            },
                        },
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: {
                            receiveLibraryConfig: {
                                receiveLibrary: avaxReceiveLibrary,
                                gracePeriod: 0,
                            },
                        },
                    },
                ],
            }

            {
                const signerFactory = createSignerFactory()
                // register new Send ULNs on ETH
                const ethSigner = await signerFactory(ethContract.eid)
                await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethReceiveLibrary))
                await ethSigner.signAndSend(
                    await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0)
                )
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0),
            ])
        })
    })

    describe('configureReceiveLibraryTimeouts', () => {
        it('should return all setPeer transactions and configureReceiveLibraryTimeouts transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)
            const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

            const ethDefaultReceiveLibrary = await getLibraryAddress(ethReceiveUln)
            const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln2_Opt2)

            const avaxDefaultReceiveLibrary = await getLibraryAddress(avaxReceiveUln)
            const avaxReceiveLibrary = await getLibraryAddress(avaxReceiveUln2_Opt2)

            // This is the OApp config that we want to use against our contracts
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
                        config: {
                            receiveLibraryConfig: {
                                receiveLibrary: ethReceiveLibrary,
                                gracePeriod: 0,
                            },
                            receiveLibraryTimeoutConfig: {
                                lib: ethDefaultReceiveLibrary,
                                expiry: 42,
                            },
                        },
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: {
                            receiveLibraryConfig: {
                                receiveLibrary: avaxReceiveLibrary,
                                gracePeriod: 0,
                            },
                            receiveLibraryTimeoutConfig: {
                                lib: avaxDefaultReceiveLibrary,
                                expiry: 42,
                            },
                        },
                    },
                ],
            }

            {
                const signerFactory = createSignerFactory()
                // register new Send ULNs on ETH
                const ethSigner = await signerFactory(ethContract.eid)
                await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethReceiveLibrary))
                await ethSigner.signAndSend(
                    await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0)
                )

                // register new Send ULNs on AVAX
                const avaxSigner = await signerFactory(avaxContract.eid)
                await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary))
                await avaxSigner.signAndSend(
                    await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0)
                )
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await ethEndpointSdk.setReceiveLibraryTimeout(
                    ethPoint.address,
                    avaxPoint.eid,
                    ethDefaultReceiveLibrary,
                    42
                ),
                await avaxEndpointSdk.setReceiveLibraryTimeout(
                    avaxPoint.address,
                    ethPoint.eid,
                    avaxDefaultReceiveLibrary,
                    42
                ),
            ])
        })
    })

    describe('configureSendConfig', () => {
        it('should return all setPeer transactions and configureSendConfig transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)
            const bscContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)
            const avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
            const avaxDvnAddress = await getLibraryAddress(avaxDvn)

            const bscPoint = omniContractToPoint(bscContract)
            const bscOAppSdk = await oappSdkFactory(bscPoint)
            const bscExecutorAddress = await getLibraryAddress(bscExecutor)
            const bscDvnAddress = await getLibraryAddress(bscDvn)

            const ethToAvaxSendUlnDVNs: string[] = [avaxDvnAddress]
            const ethToBscSendUlnDVNs: string[] = [bscDvnAddress]
            const ethSendLibrary = await getLibraryAddress(ethSendUln)

            // This is the OApp config that we want to use against our contracts
            const graph: OAppOmniGraph = {
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
                                    confirmations: 42,
                                    requiredDVNs: ethToAvaxSendUlnDVNs,
                                    optionalDVNs: ethToAvaxSendUlnDVNs,
                                    optionalDVNThreshold: 0,
                                    requiredDVNCount: ethToAvaxSendUlnDVNs.length,
                                    optionalDVNCount: ethToAvaxSendUlnDVNs.length,
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
                                    confirmations: 42,
                                    requiredDVNs: ethToBscSendUlnDVNs,
                                    optionalDVNs: ethToBscSendUlnDVNs,
                                    optionalDVNThreshold: 0,
                                    requiredDVNCount: ethToBscSendUlnDVNs.length,
                                    optionalDVNCount: ethToBscSendUlnDVNs.length,
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

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            const expectedTransactions = [
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await ethOAppSdk.setPeer(bscPoint.eid, bscPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await avaxOAppSdk.setPeer(bscPoint.eid, bscPoint.address),
                await bscOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await bscOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
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
                                confirmations: 42,
                                requiredDVNs: ethToAvaxSendUlnDVNs,
                                optionalDVNs: ethToAvaxSendUlnDVNs,
                                optionalDVNThreshold: 0,
                                requiredDVNCount: ethToAvaxSendUlnDVNs.length,
                                optionalDVNCount: ethToAvaxSendUlnDVNs.length,
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
                            eid: avaxPoint.eid,
                            ulnConfig: {
                                confirmations: 42,
                                requiredDVNs: ethToBscSendUlnDVNs,
                                optionalDVNs: ethToBscSendUlnDVNs,
                                optionalDVNThreshold: 0,
                                requiredDVNCount: ethToBscSendUlnDVNs.length,
                                optionalDVNCount: ethToBscSendUlnDVNs.length,
                            },
                        },
                    ])),
                ]),
            ]
            console.log({
                transactions: JSON.stringify(transactions),
                expectedTransactions: JSON.stringify(expectedTransactions),
            })
            expect(transactions).toEqual(expectedTransactions)
        })
    })

    describe('configureReceiveConfig', () => {
        it('should return all setPeer transactions and configureReceiveConfig transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            const ethDvnAddress = await getLibraryAddress(ethDvn)
            const ethReceiveUlnDVNs: string[] = [ethDvnAddress]

            const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)

            // This is the OApp config that we want to use against our contracts
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
                        config: {
                            receiveConfig: {
                                ulnConfig: {
                                    confirmations: 42,
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 0,
                                    requiredDVNCount: ethReceiveUlnDVNs.length,
                                    optionalDVNCount: ethReceiveUlnDVNs.length,
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
            const transactions = await configureOApp(graph, oappSdkFactory)

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                    ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                        {
                            eid: avaxPoint.eid,
                            ulnConfig: {
                                confirmations: 42,
                                requiredDVNs: ethReceiveUlnDVNs,
                                optionalDVNs: ethReceiveUlnDVNs,
                                optionalDVNThreshold: 0,
                                requiredDVNCount: ethReceiveUlnDVNs.length,
                                optionalDVNCount: ethReceiveUlnDVNs.length,
                            },
                        },
                    ])),
                ]),
            ])
        })
    })

    describe('configureSendConfig and configureReceiveConfig', () => {
        it('should return all setPeer transactions and setConfig', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)
            const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            const avaxExecutorAddress = await getLibraryAddress(avaxExecutor)
            const avaxDvnAddress = await getLibraryAddress(avaxDvn)
            const ethSendUlnDVNs: string[] = [avaxDvnAddress]

            const ethDvnAddress = await getLibraryAddress(ethDvn)
            const ethReceiveUlnDVNs: string[] = [ethDvnAddress]

            const ethSendLibrary = await getLibraryAddress(ethSendUln)
            const ethReceiveLibrary = await getLibraryAddress(ethReceiveUln)

            // This is the OApp config that we want to use against our contracts
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
                        config: {
                            sendConfig: {
                                executorConfig: {
                                    maxMessageSize: 99,
                                    executor: avaxExecutorAddress,
                                },
                                ulnConfig: {
                                    confirmations: 42,
                                    requiredDVNs: ethSendUlnDVNs,
                                    optionalDVNs: ethSendUlnDVNs,
                                    optionalDVNThreshold: 0,
                                    requiredDVNCount: ethSendUlnDVNs.length,
                                    optionalDVNCount: ethSendUlnDVNs.length,
                                },
                            },
                            receiveConfig: {
                                ulnConfig: {
                                    confirmations: 42,
                                    requiredDVNs: ethReceiveUlnDVNs,
                                    optionalDVNs: ethReceiveUlnDVNs,
                                    optionalDVNThreshold: 0,
                                    requiredDVNCount: ethReceiveUlnDVNs.length,
                                    optionalDVNCount: ethReceiveUlnDVNs.length,
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
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
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
                                confirmations: 42,
                                requiredDVNs: ethSendUlnDVNs,
                                optionalDVNs: ethSendUlnDVNs,
                                optionalDVNThreshold: 0,
                                requiredDVNCount: ethSendUlnDVNs.length,
                                optionalDVNCount: ethSendUlnDVNs.length,
                            },
                        },
                    ])),
                ]),
                await ethEndpointSdk.setConfig(ethPoint.address, ethReceiveLibrary, [
                    ...(await ethEndpointSdk.getUlnConfigParams(ethReceiveLibrary, [
                        {
                            eid: avaxPoint.eid,
                            ulnConfig: {
                                confirmations: 42,
                                requiredDVNs: ethReceiveUlnDVNs,
                                optionalDVNs: ethReceiveUlnDVNs,
                                optionalDVNThreshold: 0,
                                requiredDVNCount: ethReceiveUlnDVNs.length,
                                optionalDVNCount: ethReceiveUlnDVNs.length,
                            },
                        },
                    ])),
                ]),
            ])
        })
    })

    describe('configureEnforcedOptions', () => {
        it('should return only setPeer transaction when enforcedOptions is empty', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
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
            const transactions = await configureOApp(graph, oappSdkFactory)

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ])
        })
        it('should return setPeer and setEnforcedOptions transaction when enforcedOptions are set', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
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
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
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
    })
})
