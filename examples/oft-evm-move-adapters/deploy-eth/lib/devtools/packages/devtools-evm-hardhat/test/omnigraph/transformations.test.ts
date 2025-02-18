import fc from 'fast-check'
import { OmniPointHardhat } from '@/omnigraph'
import {
    createOmniEdgeHardhatTransformer,
    createOmniGraphHardhatTransformer,
    createOmniNodeHardhatTransformer,
    createOmniPointHardhatTransformer,
} from '@/omnigraph/transformations'
import { Contract } from '@ethersproject/contracts'
import { endpointArbitrary, evmAddressArbitrary, nullableArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { isOmniPoint, parallel, sequence } from '@layerzerolabs/devtools'

describe('omnigraph/transformations', () => {
    const pointHardhatArbitrary = fc.record({
        eid: endpointArbitrary,
        contractName: nullableArbitrary(fc.string()),
        address: nullableArbitrary(evmAddressArbitrary),
    })

    const nodeHardhatArbitrary = fc.record({
        contract: pointHardhatArbitrary,
        config: fc.anything(),
    })

    const edgeHardhatArbitrary = fc.record({
        from: pointHardhatArbitrary,
        to: pointHardhatArbitrary,
        config: fc.anything(),
    })

    describe('createOmniPointHardhatTransformer', () => {
        it('should pass the original value if contract is already an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const contractFactory = jest.fn().mockRejectedValue('Oh no')
                    const transformer = createOmniPointHardhatTransformer(contractFactory)

                    const transformed = await transformer(point)

                    expect(transformed).toBe(point)
                    expect(contractFactory).not.toHaveBeenCalled()
                })
            )
        })

        it('should call the contractFactory if contract is not an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(pointHardhatArbitrary, evmAddressArbitrary, async (point, address) => {
                    fc.pre(!isOmniPoint(point))

                    const contract = new Contract(address, [])
                    const contractFactory = jest
                        .fn()
                        .mockImplementation(async (point: OmniPointHardhat) => ({ eid: point.eid, contract }))
                    const transformer = createOmniPointHardhatTransformer(contractFactory)

                    const transformed = await transformer(point)

                    expect(transformed).toEqual({ ...point, address })
                    expect(contractFactory).toHaveBeenCalledTimes(1)
                    expect(contractFactory).toHaveBeenCalledWith(point)
                })
            )
        })

        it('should add the contractName if point is not an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(pointHardhatArbitrary, evmAddressArbitrary, async (point, address) => {
                    fc.pre(!isOmniPoint(point))

                    const contract = new Contract(address, [])
                    const contractFactory = jest
                        .fn()
                        .mockImplementation(async (point: OmniPointHardhat) => ({ eid: point.eid, contract }))
                    const transformer = createOmniPointHardhatTransformer(contractFactory)

                    const transformed = await transformer(point)

                    expect(transformed).toEqual({ eid: point.eid, address, contractName: point.contractName })
                    expect(contractFactory).toHaveBeenCalledTimes(1)
                    expect(contractFactory).toHaveBeenCalledWith(point)
                })
            )
        })
    })

    describe('createOmniNodeHardhatTransformer', () => {
        it('should call the pointTransformer on the point', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointHardhatArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (point, address, config) => {
                        fc.pre(!isOmniPoint(point))

                        const pointTransformer = jest.fn().mockImplementation(async (point: OmniPointHardhat) => ({
                            eid: point.eid,
                            address: address,
                        }))
                        const transformer = createOmniNodeHardhatTransformer(pointTransformer)

                        const node = await transformer({ contract: point, config })

                        expect(node).toEqual({ point: { eid: point.eid, address }, config })
                        expect(pointTransformer).toHaveBeenCalledTimes(1)
                        expect(pointTransformer).toHaveBeenCalledWith(point)
                    }
                )
            )
        })
    })

    describe('createOmniEdgeHardhatTransformer', () => {
        it('should call the pointTransformer on from and to', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointHardhatArbitrary,
                    pointHardhatArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (from, to, address, config) => {
                        const pointTransformer = jest.fn().mockImplementation(async (point: OmniPointHardhat) => ({
                            eid: point.eid,
                            address,
                        }))
                        const transformer = createOmniEdgeHardhatTransformer(pointTransformer)

                        const edge = await transformer({ from, to, config })

                        expect(edge).toEqual({
                            vector: { from: { eid: from.eid, address }, to: { eid: to.eid, address } },
                            config,
                        })
                        expect(pointTransformer).toHaveBeenCalledTimes(2)
                        expect(pointTransformer).toHaveBeenCalledWith(from)
                        expect(pointTransformer).toHaveBeenCalledWith(to)
                    }
                )
            )
        })
    })

    describe('createOmniGraphHardhatTransformer', () => {
        it('should return an empty graph if called with an empty graph', async () => {
            const nodeTransformer = jest.fn().mockRejectedValue('Oh node')
            const edgeTransformer = jest.fn().mockRejectedValue('Oh edge')
            const transformer = createOmniGraphHardhatTransformer(nodeTransformer, edgeTransformer)

            expect(
                await transformer({
                    contracts: [],
                    connections: [],
                })
            ).toEqual({
                contracts: [],
                connections: [],
            })
        })

        it('should call the nodeTransformer and edgeTransformer for every node and edge and return the result', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(nodeHardhatArbitrary),
                    fc.array(edgeHardhatArbitrary),
                    async (contracts, connections) => {
                        const nodeTransformer = jest.fn().mockImplementation(async (node) => ({ node }))
                        const edgeTransformer = jest.fn().mockImplementation(async (edge) => ({ edge }))
                        const transformer = createOmniGraphHardhatTransformer(nodeTransformer, edgeTransformer)

                        const graph = await transformer({ contracts, connections })

                        expect(graph.contracts).toEqual(contracts.map((node) => ({ node })))
                        expect(graph.connections).toEqual(connections.map((edge) => ({ edge })))
                    }
                )
            )
        })

        it('should support sequential applicative', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(nodeHardhatArbitrary),
                    fc.array(edgeHardhatArbitrary),
                    async (contracts, connections) => {
                        const nodeTransformer = jest.fn().mockImplementation(async (node) => ({ node }))
                        const edgeTransformer = jest.fn().mockImplementation(async (edge) => ({ edge }))
                        const transformerSequential = createOmniGraphHardhatTransformer(
                            nodeTransformer,
                            edgeTransformer,
                            sequence
                        )
                        const transformerParallel = createOmniGraphHardhatTransformer(
                            nodeTransformer,
                            edgeTransformer,
                            parallel
                        )

                        const graphSequential = await transformerSequential({ contracts, connections })
                        const graphParallel = await transformerParallel({ contracts, connections })

                        expect(graphSequential).toEqual(graphParallel)
                    }
                )
            )
        })
    })
})
