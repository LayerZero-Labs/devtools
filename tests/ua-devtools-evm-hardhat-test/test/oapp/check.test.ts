import 'hardhat'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { createConnectedContractFactory, createSignerFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { checkOAppPeers } from '@layerzerolabs/ua-devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
describe('oapp/check', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployContract('OApp')
    })

    describe('checkOAppPeers', () => {
        it('should return an empty array with an empty config', async () => {
            const graph: OAppOmniGraph = {
                contracts: [],
                connections: [],
            }
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppFactory(contractFactory)
            const oAppPeers = await checkOAppPeers(graph, sdkFactory)

            expect(oAppPeers).toEqual([])
        })

        it('should return falsy values for non connected peers', async () => {
            const contractFactory = createConnectedContractFactory()

            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const avaxPoint = omniContractToPoint(avaxContract)

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
            const sdkFactory = createOAppFactory(contractFactory)
            const oAppPeers = await checkOAppPeers(graph, sdkFactory)

            expect(oAppPeers).toEqual([
                {
                    vector: { from: ethPoint, to: avaxPoint },
                    hasPeer: false,
                },
                {
                    vector: { from: avaxPoint, to: ethPoint },
                    hasPeer: false,
                },
            ])
        })

        it('should return one truthy value for connected peers', async () => {
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppFactory(contractFactory)

            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const avaxPoint = omniContractToPoint(avaxContract)

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

            {
                const signerFactory = createSignerFactory()
                const ethSigner = await signerFactory(ethContract.eid)
                const ethOAppSdk = await sdkFactory(ethPoint)
                const ethSetPeerTx = await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address)
                await ethSigner.signAndSend(ethSetPeerTx)
            }

            const oAppPeers = await checkOAppPeers(graph, sdkFactory)

            expect(oAppPeers).toEqual([
                {
                    vector: { from: ethPoint, to: avaxPoint },
                    hasPeer: true,
                },
                {
                    vector: { from: avaxPoint, to: ethPoint },
                    hasPeer: false,
                },
            ])
        })

        it('should return all truthy values for connected peers', async () => {
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppFactory(contractFactory)

            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const avaxPoint = omniContractToPoint(avaxContract)

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

            {
                const signerFactory = createSignerFactory()

                const ethSigner = await signerFactory(ethContract.eid)
                const ethOAppSdk = await sdkFactory(ethPoint)
                const ethSetPeerTx = await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address)
                await ethSigner.signAndSend(ethSetPeerTx)

                const avaxSigner = await signerFactory(avaxContract.eid)
                const avaxOAppSdk = await sdkFactory(avaxPoint)
                const avaxSetPeerTx = await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address)
                await avaxSigner.signAndSend(avaxSetPeerTx)
            }

            const oAppPeers = await checkOAppPeers(graph, sdkFactory)

            expect(oAppPeers).toEqual([
                {
                    vector: { from: ethPoint, to: avaxPoint },
                    hasPeer: true,
                },
                {
                    vector: { from: avaxPoint, to: ethPoint },
                    hasPeer: true,
                },
            ])
        })
    })
})
