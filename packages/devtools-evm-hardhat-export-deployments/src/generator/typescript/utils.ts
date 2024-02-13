import * as A from 'fp-ts/Array'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/lib/function'

// Poor man's hashing function
const hashFunction = JSON.stringify

/**
 * Takes a record of values and produces an array of unique values
 * and a map that maps the original record keys to the array indices
 *
 * @param record `Record<string, TValue>`
 *
 * @returns `[TValue[], Record<string, number>]`
 */
export const deduplicateRecord = <TValue>(record: Record<string, TValue>): [TValue[], Record<string, number>] =>
    pipe(
        // First we turn the record into entries
        record,
        R.toEntries,
        // And group them by value hash
        NEA.groupBy(([_key, value]) => hashFunction(value)),
        // With the values grouped, we collect them into an array
        Object.values<NEA.NonEmptyArray<[string, TValue]>>,
        // And finally we create the list of unique items
        // and the map of original keys to indices
        (groupedEntries) => [
            pipe(
                groupedEntries,
                // Here we grab the value from the [key, value] tuple of the first entry
                // (since all the entries have equivalent values)
                A.map((entries) => entries[0][1])
            ),
            pipe(
                groupedEntries,
                // Here we take all the entries and map them into [key, index] tuples
                A.flatMap((entries, index) =>
                    pipe(
                        entries,
                        A.map(([key]) => [key, index] as [string, number])
                    )
                ),
                R.fromEntries
            ),
        ]
    )
