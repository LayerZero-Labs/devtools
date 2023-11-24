import fc from 'fast-check'
import { createOmniEdgeSchema, createOmniNodeSchema } from '@/omnigraph/schema'
import { z } from 'zod'
import { coordinateArbitrary, coordinatesArbitrary } from '../__utils__/arbitraries'

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
                    fc.property(coordinateArbitrary, good, (coordinate, config) => {
                        expect(schema.safeParse({ coordinate, config }).success).toBeTruthy()
                    })
                )
            })

            it('should not parse', () => {
                fc.assert(
                    fc.property(coordinateArbitrary, bad, (coordinate, config) => {
                        expect(schema.safeParse({ coordinate, config }).success).toBeFalsy()
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
                    fc.property(coordinatesArbitrary, good, (coordinates, config) => {
                        expect(schema.safeParse({ coordinates, config }).success).toBeTruthy()
                    })
                )
            })

            it('should not parse', () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, bad, (coordinates, config) => {
                        expect(schema.safeParse({ coordinates, config }).success).toBeFalsy()
                    })
                )
            })
        })
    })
})
