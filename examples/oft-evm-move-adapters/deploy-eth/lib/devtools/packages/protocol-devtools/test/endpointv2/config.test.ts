import {
    EndpointV2EdgeConfig,
    EndpointV2OmniGraph,
    IEndpointV2,
    configureEndpointV2RegisterLibraries,
} from '@/endpointv2/index'
import { OmniPoint, arePointsEqual } from '@layerzerolabs/devtools'
import fc from 'fast-check'
import { addressArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'

describe('EndpointV2/config', () => {
    describe('configureEndpointV2RegisterLibraries', () => {
        // We'll create a simple mock SDK to work with library registration
        class MockSDK {
            constructor(readonly point: OmniPoint) {}
            isRegisteredLibrary = jest.fn().mockReturnValue(false)
            registerLibrary = jest.fn((address) => ({
                point: this.point,
                data: `0xREGISTERLIBRARY ${address}`,
            }))
        }

        it('should not attempt to register libraries multiple times', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    pointArbitrary,
                    pointArbitrary,
                    addressArbitrary,
                    async (pointA, pointB, pointC, libraryAddress) => {
                        fc.pre(!arePointsEqual(pointA, pointB))
                        fc.pre(!arePointsEqual(pointB, pointC))
                        fc.pre(!arePointsEqual(pointC, pointA))

                        const config: EndpointV2EdgeConfig = {
                            defaultReceiveLibrary: libraryAddress,
                            defaultSendLibrary: libraryAddress,
                        }

                        const graph: EndpointV2OmniGraph = {
                            contracts: [],
                            connections: [
                                {
                                    vector: { from: pointA, to: pointB },
                                    config,
                                },
                                {
                                    vector: { from: pointA, to: pointC },
                                    config,
                                },
                                {
                                    vector: { from: pointB, to: pointA },
                                    config,
                                },
                                {
                                    vector: { from: pointB, to: pointC },
                                    config,
                                },
                                {
                                    vector: { from: pointC, to: pointA },
                                    config,
                                },
                                {
                                    vector: { from: pointC, to: pointB },
                                    config,
                                },
                            ],
                        }

                        const createSdk = jest.fn((point: OmniPoint) => new MockSDK(point) as unknown as IEndpointV2)
                        const result = await configureEndpointV2RegisterLibraries(graph, createSdk)

                        // The result should not contain any duplicate library registrations
                        expect(result).toEqual([
                            { point: pointA, data: `0xREGISTERLIBRARY ${libraryAddress}` },
                            { point: pointB, data: `0xREGISTERLIBRARY ${libraryAddress}` },
                            { point: pointC, data: `0xREGISTERLIBRARY ${libraryAddress}` },
                        ])
                    }
                )
            )
        })
    })
})
