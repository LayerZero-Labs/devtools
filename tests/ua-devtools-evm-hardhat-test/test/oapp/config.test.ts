import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deployOAppFixture } from '../__utils__/oapp'
import { setupDefaultEndpoint } from '../__utils__/endpoint'
import { createConnectedContractFactory, createSignerFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOApp, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { getLibraryAddress } from '../__utils__/oapp'
import { ethSendUln2_Opt2, ethReceiveUln2_Opt2, avaxSendUln2_Opt2, avaxReceiveUln2_Opt2 } from '../__utils__/endpoint'

describe('oapp/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }

    const contractFactory = createConnectedContractFactory()
    const oappSdkFactory = createOAppFactory(contractFactory)

    // const ethContract = await contractFactory(ethPointHardhat)
    // const avaxContract = await contractFactory(avaxPointHardhat)

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployOAppFixture()
        await setupDefaultEndpoint()
    })

    describe('configureOApp', () => {
        it('should return an empty array with an empty config', async () => {
            const graph: OAppOmniGraph = {
                contracts: [],
                connections: [],
            }
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppFactory(contractFactory)

            // Now we configure the OApp
            const transactions = await configureOApp(graph, sdkFactory)

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

            // {
            //     const signerFactory = createSignerFactory()
            //     // register new Send ULNs on ETH
            //     const ethSigner = await signerFactory(ethContract.eid)
            //     await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethSendLibrary))
            //     // register new Send ULNs on AVAX
            //     const avaxSigner = await signerFactory(avaxContract.eid)
            //     await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxSendLibrary))
            // }

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

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)

            {
                const signerFactory = createSignerFactory()
                // register new Send ULNs on ETH
                const ethSigner = await signerFactory(ethContract.eid)
                await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethSendLibrary))
                await ethSigner.signAndSend(
                    await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethSendLibrary)
                )
            }

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxSendLibrary),
            ])
        })
    })

    describe('configureReceiveLibraries', () => {
        it('should return all setPeer transactions', async () => {
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
            // // TODO why is this passing without registerLibrary?
            // {
            //     const signerFactory = createSignerFactory()
            //     // register new Send ULNs on ETH
            //     const ethSigner = await signerFactory(ethContract.eid)
            //     await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethReceiveLibrary))
            //     // register new Send ULNs on AVAX
            //     // const avaxSigner = await signerFactory(avaxContract.eid)
            //     // await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxReceiveLibrary))
            // }

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethReceiveLibrary, 0),
                await avaxEndpointSdk.setReceiveLibrary(avaxPoint.address, ethPoint.eid, avaxReceiveLibrary, 0),
            ])
        })
    })

    describe('configureReceiveLibraryTimeouts', () => {})

    describe('configureSendConfig', () => {})

    describe('configureReceiveConfig', () => {})

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
