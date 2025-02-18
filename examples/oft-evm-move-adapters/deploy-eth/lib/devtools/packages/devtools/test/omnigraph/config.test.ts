import {
    OmniEdge,
    OmniGraph,
    OmniNode,
    OmniPoint,
    createConfigureEdges,
    createConfigureMultiple,
    createConfigureNodes,
} from '@/omnigraph'
import { createEdgeArbitrary, createNodeArbitrary } from '../__utils__/arbitraries'
import fc from 'fast-check'
import { pointArbitrary } from '@layerzerolabs/test-devtools'
import { OmniTransaction } from '@/transactions/types'

describe('omnigraph/config', () => {
    const nodeArbitrary = createNodeArbitrary(fc.anything())
    const nodesArbitrary = fc.array(nodeArbitrary)
    const edgeArbitrary = createEdgeArbitrary(fc.anything())
    const edgesArbitrary = fc.array(edgeArbitrary)
    const graphArbitrary: fc.Arbitrary<OmniGraph> = fc.record({
        contracts: nodesArbitrary,
        connections: edgesArbitrary,
    })

    describe('createConfigureNodes', () => {
        it('should do nothing for a graph with no nodes', async () => {
            const createSdk = jest.fn()
            const configureNode = jest.fn()
            const configureNodes = createConfigureNodes<OmniGraph>(configureNode)

            await expect(configureNodes({ contracts: [], connections: [] }, createSdk)).resolves.toEqual([])

            expect(createSdk).not.toHaveBeenCalled()
            expect(configureNode).not.toHaveBeenCalled()
        })

        it('should return an empty array if configuration function returns null, undefined or an empty array', async () => {
            const createSdk = jest.fn()
            const configureNode = jest.fn()
            const configureNodes = createConfigureNodes<OmniGraph>(configureNode)

            await fc.assert(
                fc.asyncProperty(nodesArbitrary, async (contracts) => {
                    createSdk.mockClear()
                    configureNode.mockClear()

                    // We mock the node configurator to only return empty values
                    configureNode.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined).mockResolvedValue([])

                    const graph = { contracts, connections: [] }
                    await expect(configureNodes(graph, createSdk)).resolves.toEqual([])

                    expect(createSdk).toHaveBeenCalledTimes(contracts.length)
                    expect(configureNode).toHaveBeenCalledTimes(contracts.length)
                })
            )
        })

        it('should create an SDK and execute configurator for every node', async () => {
            // Just some random SDK factory
            const createSdk = jest.fn().mockImplementation((point: OmniPoint) => ({ sdkFor: point }))
            // And a configuration function that returns something that we can identify in the result
            const configureNode = jest
                .fn()
                .mockImplementation((node: OmniNode, sdk: unknown) => ({ point: node.point, sdk }))
            const configureNodes = createConfigureNodes<OmniGraph>(configureNode)

            await fc.assert(
                fc.asyncProperty(nodesArbitrary, async (contracts) => {
                    createSdk.mockClear()
                    configureNode.mockClear()

                    const graph = { contracts, connections: [] }
                    const transactions = await configureNodes(graph, createSdk)

                    // First we check that the transactions match what our configuration function would return
                    expect(transactions).toHaveLength(contracts.length)
                    expect(transactions).toEqual(
                        contracts.map(({ point }) => ({
                            point,
                            sdk: {
                                sdkFor: point,
                            },
                        }))
                    )

                    // Then we check that the configurations have been called properly
                    expect(createSdk).toHaveBeenCalledTimes(contracts.length)
                    expect(configureNode).toHaveBeenCalledTimes(contracts.length)

                    for (const contract of contracts) {
                        expect(createSdk).toHaveBeenCalledWith(contract.point)
                        expect(configureNode).toHaveBeenCalledWith(
                            contract,
                            expect.objectContaining({ sdkFor: contract.point }),
                            graph,
                            createSdk
                        )
                    }
                })
            )
        })
    })

    describe('createConfigureEdges', () => {
        it('should do nothing for a graph with no connections', async () => {
            const createSdk = jest.fn()
            const configureEdge = jest.fn()
            const configureEdges = createConfigureEdges<OmniGraph>(configureEdge)

            await expect(configureEdges({ contracts: [], connections: [] }, createSdk)).resolves.toEqual([])

            expect(createSdk).not.toHaveBeenCalled()
            expect(configureEdge).not.toHaveBeenCalled()
        })

        it('should return an empty array if configuration function returns null, undefined or an empty array', async () => {
            const createSdk = jest.fn()
            const configureEdge = jest.fn()
            const configureEdges = createConfigureEdges<OmniGraph>(configureEdge)

            await fc.assert(
                fc.asyncProperty(edgesArbitrary, async (connections) => {
                    createSdk.mockClear()
                    configureEdge.mockClear()

                    // We mock the node configurator to only return empty values
                    configureEdge.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined).mockResolvedValue([])

                    const graph = { contracts: [], connections }
                    await expect(configureEdges(graph, createSdk)).resolves.toEqual([])

                    expect(createSdk).toHaveBeenCalledTimes(connections.length)
                    expect(configureEdge).toHaveBeenCalledTimes(connections.length)
                })
            )
        })

        it('should create an SDK and execute configurator for every connection', async () => {
            // Just some random SDK factory
            const createSdk = jest.fn().mockImplementation((point: OmniPoint) => ({ sdkFor: point }))
            // And a configuration function that returns something that we can identify in the result
            const configureEdge = jest
                .fn()
                .mockImplementation((edge: OmniEdge, sdk: unknown) => ({ vector: edge.vector, sdk }))
            const configureEdges = createConfigureEdges<OmniGraph>(configureEdge)

            await fc.assert(
                fc.asyncProperty(edgesArbitrary, async (connections) => {
                    createSdk.mockClear()
                    configureEdge.mockClear()

                    const graph = { contracts: [], connections }
                    const transactions = await configureEdges(graph, createSdk)

                    // First we check that the transactions match what our configuration function would return
                    expect(transactions).toHaveLength(connections.length)
                    expect(transactions).toEqual(
                        connections.map(({ vector }) => ({
                            vector,
                            sdk: {
                                sdkFor: vector.from,
                            },
                        }))
                    )

                    // Then we check that the configurations have been called properly
                    expect(createSdk).toHaveBeenCalledTimes(connections.length)
                    expect(configureEdge).toHaveBeenCalledTimes(connections.length)

                    for (const contract of connections) {
                        expect(createSdk).toHaveBeenCalledWith(contract.vector.from)
                        expect(configureEdge).toHaveBeenCalledWith(
                            contract,
                            expect.objectContaining({ sdkFor: contract.vector.from }),
                            graph,
                            createSdk
                        )
                    }
                })
            )
        })
    })

    describe('createConfigureMultiple', () => {
        const transactionArbitrary: fc.Arbitrary<OmniTransaction> = fc.record({
            point: pointArbitrary,
            data: fc.hexaString(),
        })

        it('should return a configurator that does nothing with no configurators', async () => {
            const createSdk = jest.fn()
            const emptyConfigurator = createConfigureMultiple()

            await fc.assert(
                fc.asyncProperty(graphArbitrary, async (graph) => {
                    expect(createSdk).not.toHaveBeenCalled()

                    await expect(emptyConfigurator(graph, createSdk)).resolves.toEqual([])
                })
            )
        })

        describe.each([
            ['in parallel mode', '1'],
            ['in serial mode', ''],
        ])(`%s`, (label, mode) => {
            beforeAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = mode
            })

            afterAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = ''
            })

            it('should call all configurators', async () => {
                const createSdk = jest.fn()

                await fc.assert(
                    fc.asyncProperty(
                        graphArbitrary,
                        fc.array(transactionArbitrary),
                        async (graph, transactionGroups) => {
                            createSdk.mockClear()

                            // We create a configurator for every group of transactions
                            const configurators = transactionGroups.map((transactions) =>
                                jest.fn().mockResolvedValue(transactions)
                            )

                            // Now we execute these configurators
                            const multiConfigurator = createConfigureMultiple(...configurators)

                            // And expect to get all the transactions back
                            await expect(multiConfigurator(graph, createSdk)).resolves.toEqual(transactionGroups.flat())

                            // We also check that every configurator has been called
                            for (const configurator of configurators) {
                                expect(configurator).toHaveBeenCalledOnce()
                            }
                        }
                    )
                )
            })
        })
    })
})
