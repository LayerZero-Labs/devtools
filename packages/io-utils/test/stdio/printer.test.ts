import { printJson, printRecord, printZodErrors } from '@/stdio'
import assert from 'assert'
import { z } from 'zod'

describe('stdio/printer', () => {
    let CI: string | undefined

    // We want to force non-colorful output to make the snapshots more readable
    // and to make the tests consistent both in & out of the container
    beforeAll(() => {
        CI = process.env.CI

        process.env.CI = '1'
    })

    afterAll(() => {
        process.env.CI = CI
    })

    describe('printRecord', () => {
        const record = {
            string: 'something',
            number: 0,
            boolean: false,
            bigint: BigInt(1),
            null: null,
            undefined: undefined,
            symbol: Symbol('oh hello'),
            function: () => {},
        }
        const list = Object.values(record)

        it('should return an empty string for an empty array', () => {
            expect(printRecord([])).toMatchSnapshot()
        })

        it('should return a list of items with indices for an array', () => {
            expect(printRecord(list)).toMatchSnapshot()
        })

        it('should return a list of items with indices with a title for an array', () => {
            expect(printRecord(list, 'My items')).toMatchSnapshot()
        })

        it('should return a list of items with indices for an object', () => {
            expect(printRecord(record)).toMatchSnapshot()
        })

        it('should return a list of items with indices with a title for an object', () => {
            expect(printRecord(record, 'My items')).toMatchSnapshot()
        })

        it('should return a nested list for a nested object', () => {
            expect(
                printRecord({
                    ...record,
                    nestedArray: list,
                    nestedObject: record,
                })
            ).toMatchSnapshot()
        })

        it('should return a nested list for a nested object in array', () => {
            expect(printRecord([...list, list, record])).toMatchSnapshot()
        })
    })

    describe('printZodErrors', () => {
        const assertFailedSchema = (schema: z.ZodSchema, value: unknown): z.ZodError => {
            const result = schema.safeParse(value)
            assert(result.success === false, `Expected schema to fail for input '${value}' but it passed`)

            return result.error
        }

        it('should have a good test helper', () => {
            expect(() => assertFailedSchema(z.number(), 6)).toThrow(
                /Expected schema to fail for input '6' but it passed/
            )
        })

        it('should work for primitives', () => {
            const numericError = assertFailedSchema(z.number(), 'a string')
            const stringError = assertFailedSchema(z.string(), {})
            const bigintError = assertFailedSchema(z.bigint(), [])
            const booleanError = assertFailedSchema(z.boolean(), [])

            expect(printZodErrors(numericError)).toMatchSnapshot()
            expect(printZodErrors(stringError)).toMatchSnapshot()
            expect(printZodErrors(bigintError)).toMatchSnapshot()
            expect(printZodErrors(booleanError)).toMatchSnapshot()
        })

        it('should work for arrays', () => {
            const numericArrayError = assertFailedSchema(z.array(z.number()), 'a string')
            const stringArrayError = assertFailedSchema(z.array(z.string()), new Date())
            const bigintArrayError = assertFailedSchema(z.array(z.bigint()), {})
            const booleanArrayError = assertFailedSchema(z.array(z.boolean()), new RegExp(''))

            expect(printZodErrors(numericArrayError)).toMatchSnapshot()
            expect(printZodErrors(stringArrayError)).toMatchSnapshot()
            expect(printZodErrors(bigintArrayError)).toMatchSnapshot()
            expect(printZodErrors(booleanArrayError)).toMatchSnapshot()
        })

        it('should work for simple objects', () => {
            const recordSchema = z.object({ a: z.number() })
            const typeObjectError = assertFailedSchema(recordSchema, 'a string')
            const noPropertyObjectError = assertFailedSchema(recordSchema, {})
            const propertyObjectError1 = assertFailedSchema(recordSchema, { a: 'hello' })
            const propertyObjectError2 = assertFailedSchema(recordSchema, { a: [], b: 7 })

            expect(printZodErrors(typeObjectError)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError1)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError2)).toMatchSnapshot()
            expect(printZodErrors(noPropertyObjectError)).toMatchSnapshot()
        })

        it('should work for nested objects', () => {
            const subRecordSchema = z.object({ c: z.number() })
            const recordSchema = z.object({ a: z.array(subRecordSchema), b: subRecordSchema })
            const typeObjectError = assertFailedSchema(recordSchema, 'a string')
            const noPropertyObjectError = assertFailedSchema(recordSchema, {})
            const propertyObjectError1 = assertFailedSchema(recordSchema, { a: 'hello' })
            const propertyObjectError2 = assertFailedSchema(recordSchema, { a: [], b: 7 })
            const propertyObjectError3 = assertFailedSchema(recordSchema, { a: ['hello'], b: 7 })
            const propertyObjectError4 = assertFailedSchema(recordSchema, { a: [{ c: 'hello' }], b: 7 })
            const propertyObjectError5 = assertFailedSchema(recordSchema, { a: ['hello'], b: 7 })
            const propertyObjectError6 = assertFailedSchema(recordSchema, { a: [{ c: [] }], b: { c: true } })

            expect(printZodErrors(typeObjectError)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError1)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError2)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError3)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError4)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError5)).toMatchSnapshot()
            expect(printZodErrors(propertyObjectError6)).toMatchSnapshot()
            expect(printZodErrors(noPropertyObjectError)).toMatchSnapshot()
        })
    })

    describe('printJson', () => {
        it('should handle bigints', () => {
            expect(
                printJson({
                    bigint: BigInt(
                        '0b1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111'
                    ),
                })
            ).toMatchSnapshot()
        })
    })
})
