import fc from 'fast-check'
import { pointArbitrary } from '@layerzerolabs/test-utils'
import { OmniTransaction, flattenTransactions } from '@/transactions'

describe('transactions/utils', () => {
    const nullableArbitrary = fc.constantFrom(null, undefined)
    const transactionArbitrary: fc.Arbitrary<OmniTransaction> = fc.record({
        point: pointArbitrary,
        data: fc.hexaString(),
    })

    describe('flattenTransactions', () => {
        it('should return an empty array when called with an empty array', () => {
            expect(flattenTransactions([])).toEqual([])
        })

        it('should return an empty array when called with an array of nulls and undefineds', () => {
            fc.assert(
                fc.property(fc.array(nullableArbitrary), (transactions) => {
                    expect(flattenTransactions(transactions)).toEqual([])
                })
            )
        })

        it('should remove any nulls or undefineds', () => {
            fc.assert(
                fc.property(fc.array(fc.oneof(transactionArbitrary, nullableArbitrary)), (transactions) => {
                    const flattened = flattenTransactions(transactions)

                    for (const transaction of flattened) {
                        expect(transaction).not.toBeNull()
                        expect(transaction).not.toBeUndefined()
                    }
                })
            )
        })

        it('should flatten any arrays', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.oneof(transactionArbitrary, nullableArbitrary, fc.array(transactionArbitrary))),
                    (transactions) => {
                        const flattened = flattenTransactions(transactions)

                        for (const transaction of flattened) {
                            expect(transaction).not.toBeInstanceOf(Array)
                        }
                    }
                )
            )
        })
    })
})
