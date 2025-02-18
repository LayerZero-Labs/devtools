import { AbstractMap, HashFunction } from '@/common/map'
import fc from 'fast-check'

describe('common/map', () => {
    describe('AbstractMap', () => {
        type TestCase<K> = [label: string, keyArbitrary: fc.Arbitrary<K>, hash: HashFunction<K>]

        const testCases = [
            ['string keys', fc.string(), (value: string) => value] satisfies TestCase<string>,
            ['numeric keys', fc.integer(), (value: number) => value] satisfies TestCase<number>,
            ['array keys', fc.array(fc.oneof(fc.string(), fc.integer())), JSON.stringify] satisfies TestCase<
                (string | number)[]
            >,
            [
                'object keys',
                fc.record({
                    value: fc.string(),
                }),
                JSON.stringify,
            ] satisfies TestCase<{ value: string }>,
        ]

        const valueArbitrary = fc.anything()

        describe.each(testCases)(`for %s`, (_, keyArbitrary, hash) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class TestMap extends AbstractMap<any, any> {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                protected override hash(key: any) {
                    return hash(key)
                }
            }

            it('should have addition, update and deletion working correctly', () => {
                fc.assert(
                    fc.property(keyArbitrary, valueArbitrary, valueArbitrary, (key, value1, value2) => {
                        const map = new TestMap()

                        // Sanity check first
                        expect(map.has(key)).toBeFalsy()

                        // Set a value first
                        map.set(key, value1)

                        // Check whether the insertion worked
                        expect(map.has(key)).toBeTruthy()
                        expect(map.size).toBe(1)
                        expect(map.get(key)).toBe(value1)
                        expect(Array.from(map.keys())).toEqual([key])
                        expect(Array.from(map.values())).toEqual([value1])
                        expect(Array.from(map.entries())).toEqual([[key, value1]])

                        // Now overwrite the value
                        map.set(key, value2)

                        // Check whether the insertion worked
                        expect(map.has(key)).toBeTruthy()
                        expect(map.size).toBe(1)
                        expect(map.get(key)).toBe(value2)
                        expect(Array.from(map.keys())).toEqual([key])
                        expect(Array.from(map.values())).toEqual([value2])
                        expect(Array.from(map.entries())).toEqual([[key, value2]])

                        // Now delete the value
                        map.delete(key)

                        // And check that the deletion worked
                        expect(map.has(key)).toBeFalsy()
                        expect(map.size).toBe(0)
                        expect(map.get(key)).toBeUndefined()
                        expect(Array.from(map.keys())).toEqual([])
                        expect(Array.from(map.values())).toEqual([])
                        expect(Array.from(map.entries())).toEqual([])
                    })
                )
            })

            it('should instantiate from entries', () => {
                fc.assert(
                    fc.property(fc.array(fc.tuple(keyArbitrary, valueArbitrary)), (entries) => {
                        const map = new TestMap(entries)

                        // This looks like the simplest way of deduplicating the entries
                        //
                        // For the test below we want to make sure that we check that the map
                        // contains the last value belonging to a key - entries can contain
                        // duplicate keys so we need this helper data structure to store the last value set for a key
                        const valuesByHash = Object.fromEntries(entries.map(([key, value]) => [hash(key), value]))

                        for (const [key] of entries) {
                            const hashedKey = hash(key)
                            expect(hashedKey in valuesByHash).toBeTruthy()

                            const value = valuesByHash[hashedKey]

                            expect(map.has(key)).toBeTruthy()
                            expect(map.get(key)).toBe(value)
                        }
                    })
                )
            })

            it('should clear correctly', () => {
                fc.assert(
                    fc.property(fc.array(fc.tuple(keyArbitrary, valueArbitrary)), (entries) => {
                        const map = new TestMap(entries)

                        map.clear()

                        expect(map.size).toBe(0)
                        expect(Array.from(map.keys())).toEqual([])
                        expect(Array.from(map.values())).toEqual([])
                        expect(Array.from(map.entries())).toEqual([])
                    })
                )
            })

            it('should call forEach correctly', () => {
                fc.assert(
                    fc.property(fc.array(fc.tuple(keyArbitrary, valueArbitrary)), (entries) => {
                        const map = new TestMap(entries)
                        const callback = jest.fn()

                        map.forEach(callback)

                        // We'll get the entries from the map since the original entries
                        // might contain duplicates
                        const mapEntries = Array.from(map.entries())
                        expect(callback).toHaveBeenCalledTimes(mapEntries.length)

                        for (const [key, value] of mapEntries) {
                            expect(callback).toHaveBeenCalledWith(value, key, map)
                        }
                    })
                )
            })

            it('should use orElse if a key is not defined', () => {
                fc.assert(
                    fc.property(keyArbitrary, valueArbitrary, valueArbitrary, (key, value, orElseValue) => {
                        const map = new TestMap()
                        const orElse = jest.fn().mockReturnValue(orElseValue)

                        // Sanity check first
                        expect(map.has(key)).toBeFalsy()

                        // If the key has not been set, the map should use orElse
                        expect(map.getOrElse(key, orElse)).toBe(orElseValue)

                        // Set a value first
                        map.set(key, value)

                        // And check that orElse is not being used
                        expect(map.getOrElse(key, orElse)).toBe(value)

                        // Now delete the value
                        map.delete(key)

                        // And check that orElse is being used again
                        expect(map.getOrElse(key, orElse)).toBe(orElseValue)
                    })
                )
            })
        })
    })
})
