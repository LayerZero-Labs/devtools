import type { OAppNodeConfig } from '@/oapp/types'
import fc from 'fast-check'
import { evmAddressArbitrary, nullableArbitrary } from '@layerzerolabs/test-devtools'
import { OAppNodeConfigSchema } from '@/oapp/schema'

describe('oapp/schema', () => {
    describe('OAppNodeConfigSchema', () => {
        const oappNodeConfigArbitrary: fc.Arbitrary<OAppNodeConfig> = fc.record({
            owner: nullableArbitrary(evmAddressArbitrary),
            delegate: nullableArbitrary(evmAddressArbitrary),
        })

        it('should succeed with a valid config', () => {
            fc.assert(
                fc.property(oappNodeConfigArbitrary, (config) => {
                    expect(OAppNodeConfigSchema.parse(config)).toEqual(config)
                })
            )
        })

        it('should pass any additional properties through', () => {
            fc.assert(
                fc.property(
                    oappNodeConfigArbitrary,
                    fc.dictionary(fc.string(), fc.anything()),
                    (config, extraProperties) => {
                        const combined = Object.assign({}, extraProperties, config)

                        expect(combined).toMatchObject(OAppNodeConfigSchema.parse(combined))
                    }
                )
            )
        })
    })
})
