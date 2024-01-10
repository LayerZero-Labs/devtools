import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deployOAppFixture } from '../__utils__/oapp'
import { setupDefaultEndpoint } from '../__utils__/endpoint'
import { createConnectedContractFactory, createSignerFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOApp, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'

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
