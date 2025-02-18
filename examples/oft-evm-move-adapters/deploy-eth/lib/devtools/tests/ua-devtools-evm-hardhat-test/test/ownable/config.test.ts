import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    createConnectedContractFactory,
    createSignerFactory,
    OmniContractFactoryHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory, createOwnableFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOwnable, IOwnable, OwnableFactory, OwnableOmniGraph } from '@layerzerolabs/ua-devtools'
import { OmniContract, omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { createSignAndSend, OmniPoint } from '@layerzerolabs/devtools'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'

describe('ownable/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }

    let contractFactory: OmniContractFactoryHardhat
    let ownableFactory: OwnableFactory

    let ethContract: OmniContract
    let ethPoint: OmniPoint
    let ethOwnableSdk: IOwnable

    let avaxContract: OmniContract
    let avaxPoint: OmniPoint
    let avaxOwnableSdk: IOwnable

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployContract('OApp')

        contractFactory = createConnectedContractFactory()
        ownableFactory = createOwnableFactory(createOAppFactory(contractFactory))

        ethContract = await contractFactory(ethPointHardhat)
        avaxContract = await contractFactory(avaxPointHardhat)

        ethPoint = omniContractToPoint(ethContract)
        ethOwnableSdk = await ownableFactory(ethPoint)

        avaxPoint = omniContractToPoint(avaxContract)
        avaxOwnableSdk = await ownableFactory(avaxPoint)
    })

    describe('configureOwnable', () => {
        it('should not return any transactions if configs are undefined', async () => {
            const graph: OwnableOmniGraph = {
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

            expect(await configureOwnable(graph, ownableFactory)).toEqual([])
        })

        it('should not return any transactions if owners are undefined', async () => {
            const graph: OwnableOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            owner: undefined,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            owner: undefined,
                        },
                    },
                ],
                connections: [],
            }

            expect(await configureOwnable(graph, ownableFactory)).toEqual([])
        })

        it('should return all transferOwnerhip transactions if owners are specified', async () => {
            const graph: OwnableOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            owner: ethPoint.address,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            owner: avaxPoint.address,
                        },
                    },
                ],
                connections: [],
            }

            expect(await configureOwnable(graph, ownableFactory)).toEqual([
                await avaxOwnableSdk.setOwner(ethPoint.address),
                await ethOwnableSdk.setOwner(avaxPoint.address),
            ])
        })

        it('should not set owners that have already been set', async () => {
            const graph: OwnableOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            owner: ethPoint.address,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            owner: avaxPoint.address,
                        },
                    },
                ],
                connections: [],
            }

            const signAndSend = createSignAndSend(createSignerFactory())
            await signAndSend([await avaxOwnableSdk.setOwner(ethPoint.address)])

            expect(await configureOwnable(graph, ownableFactory)).toEqual([
                await ethOwnableSdk.setOwner(avaxPoint.address),
            ])
        })

        it('should not produce any transactions if ran again', async () => {
            const graph: OwnableOmniGraph = {
                contracts: [
                    {
                        point: avaxPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            owner: ethPoint.address,
                        },
                    },
                    {
                        point: ethPoint,
                        config: {
                            // We'll make them an interlocked couple, living in perpetual state of codependence
                            owner: avaxPoint.address,
                        },
                    },
                ],
                connections: [],
            }

            const signAndSend = createSignAndSend(createSignerFactory())
            await signAndSend(await configureOwnable(graph, ownableFactory))

            expect(await configureOwnable(graph, ownableFactory)).toEqual([])
        })
    })
})
