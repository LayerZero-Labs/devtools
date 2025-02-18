import fc from 'fast-check'
import { pointArbitrary } from '@layerzerolabs/test-devtools'
import { OmniTransaction, flattenTransactions, groupTransactionsByEid } from '@/transactions'

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

    describe('groupTransactionsByEid', () => {
        it('should return an empty map when an empty array is passed in', () => {
            expect(groupTransactionsByEid([])).toEqual(new Map())
        })

        it('should return a map with containing all the transactions passed in', () => {
            fc.assert(
                fc.property(fc.array(transactionArbitrary), (transactions) => {
                    const grouped = groupTransactionsByEid(transactions)

                    for (const transaction of transactions) {
                        expect(grouped.get(transaction.point.eid)).toContain(transaction)
                    }
                })
            )
        })

        it('should preserve the order of transaction per group', () => {
            fc.assert(
                fc.property(fc.array(transactionArbitrary), (transactions) => {
                    const grouped = groupTransactionsByEid(transactions)

                    for (const transactionsForEid of grouped.values()) {
                        // Here we want to make sure that within a group of transactions,
                        // no transactions have changed order
                        //
                        // The logic here goes something like this:
                        // - We look for the indices of transactions from the grouped array in the original array
                        // - If two transactions swapped places, this array would then contain an inversion
                        //   (transaction at an earlier index in the grouped array would appear after a transaction
                        //   at a later index). So what we do is remove the inversions by sorting the array of indices
                        //   and make sure this sorted array matches the original one
                        const transactionIndices = transactionsForEid.map((t) => transactions.indexOf(t))
                        const sortedTransactionIndices = transactionIndices.slice().sort()

                        expect(transactionIndices).toEqual(sortedTransactionIndices)
                    }
                })
            )
        })
    })
})
