import fc from 'fast-check'
import {
    createNodeArbitrary,
    createEdgeArbitrary,
    pointArbitrary,
    vectorArbitrary,
    endpointArbitrary,
} from '../__utils__/arbitraries'
import { OmniGraphBuilder, ignoreLoopback, loopbackOnly } from '@/omnigraph/builder'
import { arePointsEqual, areVectorsEqual } from '@/omnigraph'

describe('omnigraph/builder', () => {
    const nodeConfigArbitrary = fc.anything()
    const edgeConfigArbitrary = fc.anything()
    const nodeArbitrary = createNodeArbitrary(nodeConfigArbitrary)
    const nodesArbitrary = fc.array(nodeArbitrary)
    const edgeArbitrary = createEdgeArbitrary(edgeConfigArbitrary)
    const edgesArbitrary = fc.array(edgeArbitrary)

    describe('builder methods', () => {
        describe('addNodes', () => {
            it('should return self', () => {
                const builder = new OmniGraphBuilder()

                expect(builder.addNodes()).toBe(builder)
            })

            it('should do nothing if called with no nodes', () => {
                const builder = new OmniGraphBuilder()

                expect(builder.addNodes().nodes).toEqual([])
            })

            it('should add a single node', () => {
                fc.assert(
                    fc.property(nodeArbitrary, (node) => {
                        const builder = new OmniGraphBuilder()

                        builder.addNodes(node)
                        expect(builder.nodes).toEqual([node])
                    })
                )
            })

            it('should not add a duplicate node', () => {
                fc.assert(
                    fc.property(nodeArbitrary, (node) => {
                        const builder = new OmniGraphBuilder()

                        builder.addNodes(node, node)
                        expect(builder.nodes).toEqual([node])
                    })
                )
            })

            it('should overwrite a node if the points are equal', () => {
                fc.assert(
                    fc.property(pointArbitrary, nodeConfigArbitrary, nodeConfigArbitrary, (point, configA, configB) => {
                        const builder = new OmniGraphBuilder()

                        const nodeA = { point, config: configA }
                        const nodeB = { point, config: configB }

                        builder.addNodes(nodeA, nodeB)
                        expect(builder.nodes).toEqual([nodeB])
                    })
                )
            })
        })

        describe('removeNodeAt', () => {
            it('should not do anything when there are no nodes', () => {
                fc.assert(
                    fc.property(nodeArbitrary, (node) => {
                        const builder = new OmniGraphBuilder()

                        builder.removeNodeAt(node.point)
                        expect(builder.nodes).toEqual([])
                    })
                )
            })

            it('should return self', () => {
                fc.assert(
                    fc.property(nodeArbitrary, (node) => {
                        const builder = new OmniGraphBuilder()

                        expect(builder.removeNodeAt(node.point)).toBe(builder)
                    })
                )
            })

            it('should remove a node at a specified point', () => {
                fc.assert(
                    fc.property(nodeArbitrary, (node) => {
                        const builder = new OmniGraphBuilder()

                        builder.addNodes(node)
                        builder.removeNodeAt(node.point)
                        expect(builder.nodes).toEqual([])
                    })
                )
            })

            it('should not remove nodes at different points', () => {
                fc.assert(
                    fc.property(nodeArbitrary, nodeArbitrary, (nodeA, nodeB) => {
                        fc.pre(!arePointsEqual(nodeA.point, nodeB.point))

                        const builder = new OmniGraphBuilder()

                        builder.addNodes(nodeA, nodeB)
                        builder.removeNodeAt(nodeA.point)
                        expect(builder.nodes).toEqual([nodeB])
                    })
                )
            })

            it('should remove all edges connected to the node', () => {
                fc.assert(
                    fc.property(
                        nodeArbitrary,
                        nodeArbitrary,
                        nodeArbitrary,
                        edgeConfigArbitrary,
                        (nodeA, nodeB, nodeC, edgeConfig) => {
                            fc.pre(!arePointsEqual(nodeA.point, nodeB.point))
                            fc.pre(!arePointsEqual(nodeA.point, nodeC.point))
                            fc.pre(!arePointsEqual(nodeB.point, nodeC.point))

                            const builder = new OmniGraphBuilder()

                            const edgeAB = { vector: { from: nodeA.point, to: nodeB.point }, config: edgeConfig }
                            const edgeAC = { vector: { from: nodeA.point, to: nodeC.point }, config: edgeConfig }
                            const edgeBA = { vector: { from: nodeB.point, to: nodeA.point }, config: edgeConfig }
                            const edgeBC = { vector: { from: nodeB.point, to: nodeC.point }, config: edgeConfig }
                            const edgeCA = { vector: { from: nodeC.point, to: nodeA.point }, config: edgeConfig }
                            const edgeCB = { vector: { from: nodeC.point, to: nodeB.point }, config: edgeConfig }

                            builder
                                .addNodes(nodeA, nodeB, nodeC)
                                .addEdges(edgeAB, edgeAC, edgeBA, edgeBC, edgeCA, edgeCB)
                                .removeNodeAt(nodeA.point)
                            expect(builder.edges).toEqual([edgeBC, edgeCB])
                        }
                    )
                )
            })
        })

        describe('addEdges', () => {
            it('should return self', () => {
                const builder = new OmniGraphBuilder()

                expect(builder.addEdges()).toBe(builder)
            })

            it('should do nothing if called with no edges', () => {
                const builder = new OmniGraphBuilder()

                expect(builder.addEdges().edges).toEqual([])
            })

            it('should fail if from is not in the graph', () => {
                fc.assert(
                    fc.property(edgeArbitrary, nodeConfigArbitrary, (edge, nodeConfig) => {
                        const builder = new OmniGraphBuilder()

                        builder
                            .addNodes(
                                { point: edge.vector.from, config: nodeConfig },
                                { point: edge.vector.to, config: nodeConfig }
                            )
                            .removeNodeAt(edge.vector.from)

                        expect(() => builder.addEdges(edge)).toThrow()
                    })
                )
            })

            it('should fail if to is not in the graph', () => {
                fc.assert(
                    fc.property(edgeArbitrary, nodeConfigArbitrary, (edge, nodeConfig) => {
                        const builder = new OmniGraphBuilder()

                        builder
                            .addNodes(
                                { point: edge.vector.from, config: nodeConfig },
                                { point: edge.vector.to, config: nodeConfig }
                            )
                            .removeNodeAt(edge.vector.to)

                        expect(() => builder.addEdges(edge)).toThrow()
                    })
                )
            })

            it('should add a single edge', () => {
                fc.assert(
                    fc.property(edgeArbitrary, nodeConfigArbitrary, (edge, nodeConfig) => {
                        const builder = new OmniGraphBuilder()

                        builder
                            .addNodes({ point: edge.vector.from, config: nodeConfig })
                            .addNodes({ point: edge.vector.to, config: nodeConfig })
                            .addEdges(edge)
                        expect(builder.edges).toEqual([edge])
                    })
                )
            })

            it('should not add a duplicate edge', () => {
                fc.assert(
                    fc.property(edgeArbitrary, nodeConfigArbitrary, (edge, nodeConfig) => {
                        const builder = new OmniGraphBuilder()

                        builder
                            .addNodes({ point: edge.vector.from, config: nodeConfig })
                            .addNodes({ point: edge.vector.to, config: nodeConfig })
                            .addEdges(edge, edge)
                        expect(builder.edges).toEqual([edge])
                    })
                )
            })

            it('should overwrite an edge if the points are equal', () => {
                fc.assert(
                    fc.property(
                        vectorArbitrary,
                        edgeConfigArbitrary,
                        edgeConfigArbitrary,
                        nodeConfigArbitrary,
                        (vector, configA, configB, nodeConfig) => {
                            const builder = new OmniGraphBuilder()

                            const edgeA = { vector, config: configA }
                            const edgeB = { vector, config: configB }

                            builder
                                .addNodes({ point: vector.from, config: nodeConfig })
                                .addNodes({ point: vector.to, config: nodeConfig })
                                .addEdges(edgeA, edgeB)
                            expect(builder.edges).toEqual([edgeB])
                        }
                    )
                )
            })
        })

        describe('removeEdgeAt', () => {
            it('should not do anything when there are no edges', () => {
                fc.assert(
                    fc.property(edgeArbitrary, (edge) => {
                        const builder = new OmniGraphBuilder()

                        builder.removeEdgeAt(edge.vector)
                        expect(builder.edges).toEqual([])
                    })
                )
            })

            it('should return self', () => {
                fc.assert(
                    fc.property(edgeArbitrary, (edge) => {
                        const builder = new OmniGraphBuilder()

                        expect(builder.removeEdgeAt(edge.vector)).toBe(builder)
                    })
                )
            })

            it('should remove a edge at a specified vector', () => {
                fc.assert(
                    fc.property(edgeArbitrary, nodeConfigArbitrary, (edge, nodeConfig) => {
                        const builder = new OmniGraphBuilder()

                        builder
                            .addNodes({ point: edge.vector.from, config: nodeConfig })
                            .addNodes({ point: edge.vector.to, config: nodeConfig })
                            .addEdges(edge)

                        builder.removeEdgeAt(edge.vector)
                        expect(builder.edges).toEqual([])
                    })
                )
            })

            it('should not remove edges at different vectors', () => {
                fc.assert(
                    fc.property(edgeArbitrary, edgeArbitrary, nodeConfigArbitrary, (edgeA, edgeB, nodeConfig) => {
                        fc.pre(!areVectorsEqual(edgeA.vector, edgeB.vector))

                        const builder = new OmniGraphBuilder()

                        builder
                            .addNodes({ point: edgeA.vector.from, config: nodeConfig })
                            .addNodes({ point: edgeA.vector.to, config: nodeConfig })
                            .addNodes({ point: edgeB.vector.from, config: nodeConfig })
                            .addNodes({ point: edgeB.vector.to, config: nodeConfig })
                            .addEdges(edgeA, edgeB)
                        builder.removeEdgeAt(edgeA.vector)
                        expect(builder.edges).toEqual([edgeB])
                    })
                )
            })
        })

        describe('reconnect', () => {
            it('should return self', () => {
                const builder = new OmniGraphBuilder()
                const reconnector = jest.fn()

                expect(builder.reconnect(reconnector)).toBe(builder)
            })

            it('should not call reconnector when there are no nodes', () => {
                const builder = new OmniGraphBuilder()
                const reconnector = jest.fn()

                builder.reconnect(reconnector)

                expect(builder.nodes).toEqual([])
                expect(builder.edges).toEqual([])
                expect(reconnector).not.toHaveBeenCalled()
            })

            it('should call reconnector for every node combination', () => {
                fc.assert(
                    fc.property(nodesArbitrary, (nodes) => {
                        const builder = new OmniGraphBuilder()
                        const reconnector = jest.fn()

                        builder.addNodes(...nodes)
                        builder.reconnect(reconnector)
                        expect(reconnector).toHaveBeenCalledTimes(builder.nodes.length * builder.nodes.length)

                        for (const nodeA of builder.nodes) {
                            for (const nodeB of builder.nodes) {
                                expect(reconnector).toHaveBeenCalledWith(nodeA, nodeB, undefined)
                            }
                        }
                    })
                )
            })
        })
    })

    describe('accessor methods', () => {
        describe('getNodeAt', () => {
            it('should return undefined when there are no nodes', () => {
                const builder = new OmniGraphBuilder()

                fc.assert(
                    fc.property(pointArbitrary, (point) => {
                        expect(builder.getNodeAt(point)).toBeUndefined()
                    })
                )
            })

            it('should return undefined when there are no nodes at a specified point', () => {
                fc.assert(
                    fc.property(nodesArbitrary, (nodes) => {
                        const node = nodes.at(-1)
                        fc.pre(node != null)

                        const builder = new OmniGraphBuilder()

                        builder.addNodes(...nodes)
                        builder.removeNodeAt(node!.point)
                        expect(builder.getNodeAt(node!.point)).toBeUndefined()
                    })
                )
            })

            it('should return node when there is a node at a specified point', () => {
                fc.assert(
                    fc.property(nodesArbitrary, (nodes) => {
                        const node = nodes.at(-1)
                        fc.pre(node != null)

                        const builder = new OmniGraphBuilder()

                        builder.addNodes(...nodes)
                        expect(builder.getNodeAt(node!.point)).toBe(node)
                    })
                )
            })
        })

        describe('getEdgeAt', () => {
            it('should return undefined when there are no edges', () => {
                const builder = new OmniGraphBuilder()

                fc.assert(
                    fc.property(vectorArbitrary, (vector) => {
                        expect(builder.getEdgeAt(vector)).toBeUndefined()
                    })
                )
            })

            it('should return undefined when there are no edges at a specified vector', () => {
                fc.assert(
                    fc.property(edgesArbitrary, nodeConfigArbitrary, (edges, nodeConfig) => {
                        const edge = edges.at(-1)
                        fc.pre(edge != null)

                        const builder = new OmniGraphBuilder()
                        const nodes = edges.flatMap(({ vector: { from, to } }) => [
                            { point: from, config: nodeConfig },
                            { point: to, config: nodeConfig },
                        ])

                        builder
                            .addNodes(...nodes)
                            .addEdges(...edges)
                            .removeEdgeAt(edge!.vector)
                        expect(builder.getEdgeAt(edge!.vector)).toBeUndefined()
                    })
                )
            })

            it('should return edge when there is a edge at a specified vector', () => {
                fc.assert(
                    fc.property(edgesArbitrary, nodeConfigArbitrary, (edges, nodeConfig) => {
                        const edge = edges.at(-1)
                        fc.pre(edge != null)

                        const builder = new OmniGraphBuilder()
                        const nodes = edges.flatMap(({ vector: { from, to } }) => [
                            { point: from, config: nodeConfig },
                            { point: to, config: nodeConfig },
                        ])

                        builder.addNodes(...nodes).addEdges(...edges)
                        expect(builder.getEdgeAt(edge!.vector)).toBe(edge)
                    })
                )
            })
        })

        describe('getEdgesFrom', () => {
            it('should return an empty array when there are no edges', () => {
                const builder = new OmniGraphBuilder()

                fc.assert(
                    fc.property(pointArbitrary, (point) => {
                        expect(builder.getEdgesFrom(point)).toEqual([])
                    })
                )
            })

            it('should return all edges that originate at a specific point', () => {
                fc.assert(
                    fc.property(edgesArbitrary, nodeConfigArbitrary, (edges, nodeConfig) => {
                        const edge = edges.at(-1)
                        fc.pre(edge != null)

                        const builder = new OmniGraphBuilder()
                        const nodes = edges.flatMap(({ vector: { from, to } }) => [
                            { point: from, config: nodeConfig },
                            { point: to, config: nodeConfig },
                        ])

                        builder.addNodes(...nodes).addEdges(...edges)

                        const edgesFrom = builder.edges.filter(({ vector }) =>
                            arePointsEqual(vector.from, edge!.vector.from)
                        )
                        expect(builder.getEdgesFrom(edge!.vector.from)).toEqual(edgesFrom)
                    })
                )
            })
        })

        describe('getEdgesTo', () => {
            it('should return an empty array when there are no edges', () => {
                const builder = new OmniGraphBuilder()

                fc.assert(
                    fc.property(pointArbitrary, (point) => {
                        expect(builder.getEdgesTo(point)).toEqual([])
                    })
                )
            })

            it('should return all edges that end at a specific point', () => {
                fc.assert(
                    fc.property(edgesArbitrary, nodeConfigArbitrary, (edges, nodeConfig) => {
                        const edge = edges.at(-1)
                        fc.pre(edge != null)

                        const builder = new OmniGraphBuilder()
                        const nodes = edges.flatMap(({ vector: { from, to } }) => [
                            { point: from, config: nodeConfig },
                            { point: to, config: nodeConfig },
                        ])

                        builder.addNodes(...nodes).addEdges(...edges)

                        const edgesTo = builder.edges.filter(({ vector }) => arePointsEqual(vector.to, edge!.vector.to))
                        expect(builder.getEdgesTo(edge!.vector.to)).toEqual(edgesTo)
                    })
                )
            })
        })
    })

    describe('reconnectors', () => {
        describe('ignoreLoopback', () => {
            describe('when eids match', () => {
                it('should return undefined and not call reconnector', () => {
                    fc.assert(
                        fc.property(nodeArbitrary, nodeArbitrary, endpointArbitrary, (nodeA, nodeB, eid) => {
                            const reconnector = jest.fn()

                            const nodeAWithEid = { ...nodeA, point: { ...nodeA.point, eid } }
                            const nodeBWithEid = { ...nodeB, point: { ...nodeB.point, eid } }

                            const newEdge = ignoreLoopback(reconnector)(nodeAWithEid, nodeBWithEid, undefined)
                            expect(newEdge).toBeUndefined()
                            expect(reconnector).not.toHaveBeenCalled()
                        })
                    )
                })
            })

            describe('when eids differ', () => {
                it('should call reconnector and return its value', () => {
                    fc.assert(
                        fc.property(
                            nodeArbitrary,
                            nodeArbitrary,
                            edgeArbitrary,
                            edgeArbitrary,
                            (nodeA, nodeB, edge, reconnectedEdge) => {
                                fc.pre(nodeA.point.eid !== nodeB.point.eid)

                                const reconnector = jest.fn().mockReturnValue(reconnectedEdge)
                                const newEdge = ignoreLoopback(reconnector)(nodeA, nodeB, edge)

                                expect(reconnector).toHaveBeenCalledWith(nodeA, nodeB, edge)
                                expect(newEdge).toBe(reconnectedEdge)
                            }
                        )
                    )
                })
            })
        })

        describe('loopbackOnly', () => {
            describe('when eids match', () => {
                it('should call reconnector and return its value', () => {
                    fc.assert(
                        fc.property(
                            nodeArbitrary,
                            nodeArbitrary,
                            endpointArbitrary,
                            edgeArbitrary,
                            edgeArbitrary,
                            (nodeA, nodeB, eid, edge, reconnectedEdge) => {
                                fc.pre(nodeA.point.eid !== nodeB.point.eid)

                                const reconnector = jest.fn().mockReturnValue(reconnectedEdge)
                                const nodeAWithEid = { ...nodeA, point: { ...nodeA.point, eid } }
                                const nodeBWithEid = { ...nodeB, point: { ...nodeB.point, eid } }

                                const newEdge = loopbackOnly(reconnector)(nodeAWithEid, nodeBWithEid, edge)

                                expect(newEdge).toBe(reconnectedEdge)
                                expect(reconnector).toHaveBeenCalledWith(nodeAWithEid, nodeBWithEid, edge)
                                expect(newEdge).toBe(reconnectedEdge)
                            }
                        )
                    )
                })
            })

            describe('when eids differ', () => {
                it('should return undefined and not call reconnector', () => {
                    fc.assert(
                        fc.property(nodeArbitrary, nodeArbitrary, (nodeA, nodeB) => {
                            fc.pre(nodeA.point.eid !== nodeB.point.eid)

                            const reconnector = jest.fn()

                            const newEdge = loopbackOnly(reconnector)(nodeA, nodeB, undefined)
                            expect(newEdge).toBeUndefined()
                            expect(reconnector).not.toHaveBeenCalled()
                        })
                    )
                })
            })
        })
    })
})
