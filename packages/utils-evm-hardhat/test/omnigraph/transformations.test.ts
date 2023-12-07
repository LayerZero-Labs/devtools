import fc from 'fast-check'
import { OmniPointHardhat } from '@/omnigraph'
import {
    createOmniEdgeHardhatTransformer,
    createOmniGraphHardhatTransformer,
    createOmniNodeHardhatTransformer,
} from '@/omnigraph/transformations'
import { Contract } from '@ethersproject/contracts'
import { endpointArbitrary, evmAddressArbitrary, nullableArbitrary, pointArbitrary } from '@layerzerolabs/test-utils'
import { isOmniPoint } from '@layerzerolabs/utils'

describe('omnigraph/transformations', () => {
    const pointHardhatArbitrary = fc.record({
        eid: endpointArbitrary,
        contractName: nullableArbitrary(fc.string()),
        address: nullableArbitrary(evmAddressArbitrary),
    })

    describe('createOmniNodeHardhatTransformer', () => {
        it('should pass the original value if contract is already an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.anything(), async (point, config) => {
                    const contractFactory = jest.fn().mockRejectedValue('Oh no')
                    const transformer = createOmniNodeHardhatTransformer(contractFactory)

                    const node = await transformer({ contract: point, config })

                    expect(node).toEqual({ point, config })
                    expect(contractFactory).not.toHaveBeenCalled()
                })
            )
        })

        it('should call the contractFactory if contract is not an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointHardhatArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (point, address, config) => {
                        fc.pre(!isOmniPoint(point))

                        const contract = new Contract(address, [])
                        const contractFactory = jest
                            .fn()
                            .mockImplementation(async (point: OmniPointHardhat) => ({ eid: point.eid, contract }))
                        const transformer = createOmniNodeHardhatTransformer(contractFactory)

                        const node = await transformer({ contract: point, config })

                        expect(node).toEqual({ point: { eid: point.eid, address }, config })
                        expect(contractFactory).toHaveBeenCalledTimes(1)
                        expect(contractFactory).toHaveBeenCalledWith(point)
                    }
                )
            )
        })
    })

    describe('createOmniEdgeHardhatTransformer', () => {
        it('should pass the original values if from and to are already OmniPoints', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, pointArbitrary, fc.anything(), async (from, to, config) => {
                    const contractFactory = jest.fn().mockRejectedValue('Oh no')
                    const transformer = createOmniEdgeHardhatTransformer(contractFactory)

                    const edge = await transformer({ from, to, config })

                    expect(edge).toEqual({ vector: { from, to }, config })
                    expect(contractFactory).not.toHaveBeenCalled()
                })
            )
        })

        it('should call the contractFactory if from is not an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointHardhatArbitrary,
                    pointArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (from, to, address, config) => {
                        fc.pre(!isOmniPoint(from))

                        const contract = new Contract(address, [])
                        const contractFactory = jest
                            .fn()
                            .mockImplementation(async (point: OmniPointHardhat) => ({ eid: point.eid, contract }))
                        const transformer = createOmniEdgeHardhatTransformer(contractFactory)

                        const edge = await transformer({ from, to, config })

                        expect(edge).toEqual({ vector: { from: { eid: from.eid, address }, to }, config })
                        expect(contractFactory).toHaveBeenCalledTimes(1)
                        expect(contractFactory).toHaveBeenCalledWith(from)
                    }
                )
            )
        })

        it('should call the contractFactory if to is not an OmniPoint', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    pointHardhatArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (from, to, address, config) => {
                        fc.pre(!isOmniPoint(to))

                        const contract = new Contract(address, [])
                        const contractFactory = jest
                            .fn()
                            .mockImplementation(async (point: OmniPointHardhat) => ({ eid: point.eid, contract }))
                        const transformer = createOmniEdgeHardhatTransformer(contractFactory)

                        const edge = await transformer({ from, to, config })

                        expect(edge).toEqual({ vector: { from, to: { eid: to.eid, address } }, config })
                        expect(contractFactory).toHaveBeenCalledTimes(1)
                        expect(contractFactory).toHaveBeenCalledWith(to)
                    }
                )
            )
        })

        it('should call the contractFactory if from & to are not OmniPoints', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointHardhatArbitrary,
                    pointHardhatArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (from, to, address, config) => {
                        fc.pre(!isOmniPoint(from))
                        fc.pre(!isOmniPoint(to))

                        const contract = new Contract(address, [])
                        const contractFactory = jest
                            .fn()
                            .mockImplementation(async (point: OmniPointHardhat) => ({ eid: point.eid, contract }))
                        const transformer = createOmniEdgeHardhatTransformer(contractFactory)

                        const edge = await transformer({ from, to, config })

                        expect(edge).toEqual({
                            vector: { from: { eid: from.eid, address }, to: { eid: to.eid, address } },
                            config,
                        })
                        expect(contractFactory).toHaveBeenCalledTimes(2)
                        expect(contractFactory).toHaveBeenCalledWith(from)
                        expect(contractFactory).toHaveBeenCalledWith(to)
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
            const nodeHardhatArbitrary = fc.record({
                contract: pointHardhatArbitrary,
                config: fc.anything(),
            })

            const edgeHardhatArbitrary = fc.record({
                from: pointHardhatArbitrary,
                to: pointHardhatArbitrary,
                config: fc.anything(),
            })

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
    })
})
