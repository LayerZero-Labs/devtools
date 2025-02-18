import { OmniGraphBuilderHardhat } from '@/omnigraph/builder'

describe('omnigraph/builder', () => {
    it('should not allow instantiation', () => {
        expect(() => new OmniGraphBuilderHardhat()).toThrow(
            /OmniGraphBuilderHardhat cannot be instantiated - it only provides static utilities for working with OmniGraph/
        )
    })
})
