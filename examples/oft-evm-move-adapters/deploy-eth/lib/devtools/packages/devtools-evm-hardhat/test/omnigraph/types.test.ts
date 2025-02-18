/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jest/expect-expect */

import type { InferOmniGraph, OmniGraphHardhat } from '@/omnigraph/types'
import type { OmniGraph } from '@layerzerolabs/devtools'

describe('omnigraph/types', () => {
    describe('InferOmniGraph', () => {
        type MyNodeConfig = string
        type MyEdgeConfig = number
        type MyOmniGraphHardhat = OmniGraphHardhat<MyNodeConfig, MyEdgeConfig>

        it('should not allow non-OmniGraphHardhat type parameter', () => {
            // @ts-expect-error should only accept OmniGraphHardhat type
            type MyOmniGraph = InferOmniGraph<string>
        })

        it('should turn OmniGraphHardhat into matching OmniGraph', () => {
            type ExpectedOmniGraph = OmniGraph<MyNodeConfig, MyEdgeConfig>
            type MyOmniGraph = InferOmniGraph<MyOmniGraphHardhat>

            const graph: MyOmniGraph = { contracts: [], connections: [] }
            const expectedGraph: ExpectedOmniGraph = graph

            type UnexpectedOmniGraph = OmniGraph<boolean, bigint>
            // @ts-expect-error UnexpectedOmniGraph is not compatible with MyOmniGraph
            const unexpectedOmniGraph: UnexpectedOmniGraph = graph
        })
    })
})
