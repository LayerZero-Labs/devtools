/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jest/expect-expect */
import { OmniEdge, OmniNode, OmniPoint, OmniVector } from '@/omnigraph'
import { Factory } from '@/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('schema/types', () => {
    describe('OmniNode', () => {
        const point: OmniPoint = { eid: EndpointId.ZORA_TESTNET, address: '' }

        it('should allow undefined config for unknown TConfig', () => {
            const node: OmniNode<unknown> = { point }
        })

        it('should allow undefined config for a union', () => {
            const node: OmniNode<number | undefined> = { point }
        })

        it('should allow undefined config for undefined TConfig', () => {
            const node: OmniNode<undefined> = { point }
        })

        it('should not allow undefined config for null TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const node: OmniNode<null> = { point }
        })

        it('should not allow undefined config for string TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const node: OmniNode<string> = { point }
        })

        it('should not allow undefined config for object TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const node: OmniNode<{ something: 'here' }> = { point }
        })

        it('should not allow mismatching TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const node: OmniNode<{ something: 'here' }> = { point, config: 7 }
        })

        it('should allow string config for string TConfig', () => {
            const node: OmniNode<string> = { point, config: 'some config' }
        })

        it('should allow number config for number TConfig', () => {
            const node: OmniNode<number> = { point, config: 6 }
        })

        it('should allow object config for object TConfig', () => {
            const node: OmniNode<{ something: 'here' }> = { point, config: { something: 'here' } }
        })

        it('should work with generic functions', () => {
            const fn = <TConfig>(config: TConfig): OmniNode<TConfig> => ({ point, config })
        })

        it('should work with assignment', () => {
            const node: OmniNode<number> = { point, config: 6 }
            const anotherNode: OmniNode<number> = { ...node }
        })

        it('should work with destructuring', () => {
            const node: OmniNode<number> = { point, config: 6 }
            const anotherNode: OmniNode<number> = { point: node.point, config: node.config }
        })
    })

    describe('OmniEdge', () => {
        const from: OmniPoint = { eid: EndpointId.ZORA_TESTNET, address: '' }
        const to: OmniPoint = { eid: EndpointId.ARBITRUM_TESTNET, address: '' }
        const vector: OmniVector = { from, to }

        it('should allow undefined config for unknown TConfig', () => {
            const edge: OmniEdge<unknown> = { vector }
        })

        it('should allow undefined config for undefined TConfig', () => {
            const edge: OmniEdge<undefined> = { vector }
        })

        it('should allow undefined config for a union', () => {
            const edge: OmniEdge<number | undefined> = { vector }
        })

        it('should not allow undefined config for null TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const edge: OmniEdge<null> = { vector }
        })

        it('should not allow undefined config for string TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const edge: OmniEdge<string> = { vector }
        })

        it('should not allow undefined config for object TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const edge: OmniEdge<{ something: 'here' }> = { vector }
        })

        it('should not allow mismatching TConfig', () => {
            // @ts-expect-error null config type should be forced to exist
            const edge: OmniEdge<{ something: 'here' }> = { vector, config: 7 }
        })

        it('should allow string config for string TConfig', () => {
            const edge: OmniEdge<string> = { vector, config: 'some config' }
        })

        it('should allow number config for number TConfig', () => {
            const edge: OmniEdge<number> = { vector, config: 6 }
        })

        it('should allow object config for object TConfig', () => {
            const edge: OmniEdge<{ something: 'here' }> = { vector, config: { something: 'here' } }
        })

        it('should work with generic functions', () => {
            const fn = <TConfig>(config: TConfig): OmniEdge<TConfig> => ({ vector, config })
        })

        it('should work with assignment', () => {
            const edge: OmniEdge<number> = { vector, config: 6 }
            const anotherNode: OmniEdge<number> = { ...edge }
        })

        it('should work with destructuring', () => {
            const edge: OmniEdge<number> = { vector, config: 6 }
            const anotherNode: OmniEdge<number> = { vector: edge.vector, config: edge.config }
        })
    })

    describe('Factory', () => {
        it('should not allow a factory that changes input types', () => {
            // @ts-expect-error The input of the factory is a string, not a boolean
            const factory: Factory<[boolean], boolean> = (a: string): boolean => !!a
        })

        it('should not allow a factory that changes output types', () => {
            // @ts-expect-error The output of the factory is a string, not a boolean
            const factory: Factory<[boolean], boolean> = (a: string): string => a
        })

        it('should allow a sync factory', () => {
            const factory: Factory<[boolean], boolean> = (a: boolean) => a
        })

        it('should allow an async factory', () => {
            const factory: Factory<[boolean], boolean> = async (a: boolean) => a
        })
    })
})
