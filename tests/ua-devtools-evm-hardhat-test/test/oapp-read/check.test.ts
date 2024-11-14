import 'hardhat'
import { checkOAppReadChannels, OAppReadOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppReadFactory } from '@layerzerolabs/ua-devtools-evm'
import { createConnectedContractFactory, createSignerFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'

describe('oapp-read/check', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOAppRead' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOAppRead' }

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployContract('OAppRead')
    })

    describe('checkOAppReadChannels', () => {
        it('should return an empty array with an empty config', async () => {
            const graph: OAppReadOmniGraph = {
                contracts: [],
                connections: [],
            }
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppReadFactory(contractFactory)
            const oAppPeers = await checkOAppReadChannels(graph, sdkFactory)

            expect(oAppPeers).toEqual([])
        })

        it('should return falsy values for non connected channels', async () => {
            const contractFactory = createConnectedContractFactory()

            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const avaxPoint = omniContractToPoint(avaxContract)

            const graph: OAppReadOmniGraph = {
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
            const sdkFactory = createOAppReadFactory(contractFactory)
            const oAppReadChannels = await checkOAppReadChannels(graph, sdkFactory)

            expect(oAppReadChannels).toEqual([
                {
                    contract: ethPoint,
                    channelId: ChannelId.READ_CHANNEL_1,
                    isActive: false,
                },
                {
                    contract: avaxPoint,
                    channelId: ChannelId.READ_CHANNEL_1,
                    isActive: false,
                },
            ])
        })

        it('should return one truthy value for connected channels', async () => {
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppReadFactory(contractFactory)

            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const avaxPoint = omniContractToPoint(avaxContract)

            const graph: OAppReadOmniGraph = {
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

            {
                const signerFactory = createSignerFactory()
                const ethSigner = await signerFactory(ethContract.eid)
                const ethOAppSdk = await sdkFactory(ethPoint)
                const ethSetReadChannel = await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true)
                await ethSigner.signAndSend(ethSetReadChannel)
            }

            const oAppReadChannels = await checkOAppReadChannels(graph, sdkFactory)

            expect(oAppReadChannels).toEqual([
                {
                    contract: ethPoint,
                    channelId: ChannelId.READ_CHANNEL_1,
                    isActive: true,
                },
                {
                    contract: avaxPoint,
                    channelId: ChannelId.READ_CHANNEL_1,
                    isActive: false,
                },
            ])
        })

        it('should return all truthy values for connected channels', async () => {
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppReadFactory(contractFactory)

            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const avaxPoint = omniContractToPoint(avaxContract)

            const graph: OAppReadOmniGraph = {
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

            {
                const signerFactory = createSignerFactory()

                const ethSigner = await signerFactory(ethContract.eid)
                const ethOAppSdk = await sdkFactory(ethPoint)
                const ethSetReadChannel = await ethOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true)
                await ethSigner.signAndSend(ethSetReadChannel)

                const avaxSigner = await signerFactory(avaxContract.eid)
                const avaxOAppSdk = await sdkFactory(avaxPoint)
                const avaxSetReadChannel = await avaxOAppSdk.setReadChannel(ChannelId.READ_CHANNEL_1, true)
                await avaxSigner.signAndSend(avaxSetReadChannel)
            }

            const oAppReadChannels = await checkOAppReadChannels(graph, sdkFactory)

            expect(oAppReadChannels).toEqual([
                {
                    contract: ethPoint,
                    channelId: ChannelId.READ_CHANNEL_1,
                    isActive: true,
                },
                {
                    contract: avaxPoint,
                    channelId: ChannelId.READ_CHANNEL_1,
                    isActive: true,
                },
            ])
        })
    })
})
