import { printRecord } from '@/stdio'

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
})
