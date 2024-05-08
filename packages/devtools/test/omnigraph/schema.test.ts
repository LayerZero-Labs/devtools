import fc from 'fast-check'
import { pointArbitrary, vectorArbitrary } from '@layerzerolabs/test-devtools'
import { UIntBigIntSchema, UIntNumberSchema, createOmniEdgeSchema, createOmniNodeSchema } from '@/omnigraph/schema'
import { ZodError, z } from 'zod'

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

    describe('UIntBigIntSchema', () => {
        it('should work for non-negative bigints', () => {
            fc.assert(
                fc.property(fc.bigInt({ min: BigInt(0) }), (value) => {
                    expect(UIntBigIntSchema.parse(value)).toBe(value)
                })
            )
        })

        it('should not work for negative bigints', () => {
            fc.assert(
                fc.property(fc.bigInt({ max: BigInt(-1) }), (value) => {
                    expect(() => UIntBigIntSchema.parse(value)).toThrow()
                })
            )
        })

        it('should work for non-negative bigint strings', () => {
            fc.assert(
                fc.property(fc.bigInt({ min: BigInt(0) }), (value) => {
                    expect(UIntBigIntSchema.parse(String(value))).toBe(value)
                })
            )
        })

        it('should not work for negative bigint strings', () => {
            fc.assert(
                fc.property(fc.bigInt({ max: BigInt(-1) }), (value) => {
                    expect(() => UIntBigIntSchema.parse(String(value))).toThrow()
                })
            )
        })

        it('should work for non-negative integers', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0 }), (value) => {
                    expect(UIntBigIntSchema.parse(value)).toBe(BigInt(value))
                })
            )
        })

        it('should not work for negative integers', () => {
            fc.assert(
                fc.property(fc.integer({ max: -1 }), (value) => {
                    expect(() => UIntBigIntSchema.parse(value)).toThrow()
                })
            )
        })

        it('should work for non-negative integer strings', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0 }), (value) => {
                    expect(UIntBigIntSchema.parse(String(value))).toBe(BigInt(value))
                })
            )
        })

        it('should not work for negative integer strings', () => {
            fc.assert(
                fc.property(fc.integer({ max: -1 }), (value) => {
                    expect(() => UIntBigIntSchema.parse(String(value))).toThrow()
                })
            )
        })

        it('should throw a ZodError for invalid values', () => {
            fc.assert(
                fc.property(fc.anything(), (value) => {
                    let isValid = false

                    try {
                        isValid = UIntBigIntSchema.safeParse(value).success
                    } catch {
                        // This catch block is designed to catch errors caused by messed up standard methods
                        // like toString or toValue that fast check throws at us
                    }

                    fc.pre(!isValid)

                    // Here we expect that whatever we got, we'll not receive a SyntaxError
                    // (coming from a BigInt() constructor) but a ZodError
                    expect(() => UIntBigIntSchema.parse(value)).toThrow(ZodError)
                })
            )
        })

        it('should mention the object path for undefined values', () => {
            const ObjectSchema = z.object({ value: UIntBigIntSchema })

            expect(() => ObjectSchema.parse({ value: undefined })).toThrowErrorMatchingSnapshot()
        })
    })

    describe('UIntNumberSchema', () => {
        it('should work for non-negative integers', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0 }), (value) => {
                    expect(UIntNumberSchema.parse(value)).toBe(value)
                })
            )
        })

        it('should not work for negative integers', () => {
            fc.assert(
                fc.property(fc.integer({ max: -1 }), (value) => {
                    expect(() => UIntNumberSchema.parse(value)).toThrow()
                })
            )
        })

        it('should work for non-negative integer strings', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0 }), (value) => {
                    expect(UIntNumberSchema.parse(String(value))).toBe(value)
                })
            )
        })

        it('should not work for negative integer strings', () => {
            fc.assert(
                fc.property(fc.integer({ max: -1 }), (value) => {
                    expect(() => UIntNumberSchema.parse(String(value))).toThrow()
                })
            )
        })

        it('should throw a ZodError for invalid values', () => {
            fc.assert(
                fc.property(fc.anything(), (value) => {
                    let isValid = false

                    try {
                        isValid = UIntNumberSchema.safeParse(value).success
                    } catch {
                        // This catch block is designed to catch errors caused by messed up standard methods
                        // like toString or toValue that fast check throws at us
                    }

                    fc.pre(!isValid)

                    // Here we expect that whatever we got, we'll not receive a SyntaxError
                    // (coming from a BigInt() constructor) but a ZodError
                    expect(() => UIntNumberSchema.parse(value)).toThrow(ZodError)
                })
            )
        })
    })
})
