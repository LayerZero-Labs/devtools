import fc from 'fast-check'
import { createOmniEdgeSchema, createOmniNodeSchema } from '@/omnigraph/schema'
import { z } from 'zod'
import { pointArbitrary, vectorArbitrary } from '../__utils__/arbitraries'

describe('omnigraph/schema', () => {
    interface TestCase {
        configSchema: z.ZodSchema
        good: fc.Arbitrary<unknown>
        bad: fc.Arbitrary<unknown>
    }

    const TEST_CASES: TestCase[] = [
        {
            configSchema: z.string(),
            good: fc.string(),
            bad: fc.anything().filter((value) => typeof value !== 'string'),
        },
        {
            configSchema: z.object({ a: z.number().nonnegative() }),
            good: fc.record({ a: fc.integer({ min: 0 }) }),
            bad: fc.oneof(fc.constant({ a: -1 }), fc.string(), fc.integer(), fc.date()),
        },
    ]

    describe('createOmniNodeSchema', () => {
        describe.each(TEST_CASES)(`schema`, ({ configSchema, good, bad }) => {
            const schema = createOmniNodeSchema(configSchema)

            it('should parse successfully', () => {
                fc.assert(
                    fc.property(pointArbitrary, good, (point, config) => {
                        expect(schema.safeParse({ point, config }).success).toBeTruthy()
                    })
                )
            })

            it('should not parse', () => {
                fc.assert(
                    fc.property(pointArbitrary, bad, (point, config) => {
                        expect(schema.safeParse({ point, config }).success).toBeFalsy()
                    })
                )
            })
        })
    })

    describe('createOmniEdgeSchema', () => {
        describe.each(TEST_CASES)(`schema`, ({ configSchema, good, bad }) => {
            const schema = createOmniEdgeSchema(configSchema)

            it('should parse successfully', () => {
                fc.assert(
                    fc.property(vectorArbitrary, good, (vector, config) => {
                        expect(schema.safeParse({ vector, config }).success).toBeTruthy()
                    })
                )
            })

            it('should not parse', () => {
                fc.assert(
                    fc.property(vectorArbitrary, bad, (vector, config) => {
                        expect(schema.safeParse({ vector, config }).success).toBeFalsy()
                    })
                )
            })
        })
    })
})
