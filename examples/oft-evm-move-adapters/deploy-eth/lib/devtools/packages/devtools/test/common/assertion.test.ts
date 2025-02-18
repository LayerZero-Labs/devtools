import { isDeepEqual } from '@/common/assertion'
import fc from 'fast-check'

describe('common/assertion', () => {
    describe('isDeepEqual', () => {
        const arrayArbitrary = fc.array(fc.anything())
        const entriesArbitrary = fc.array(fc.tuple(fc.anything(), fc.anything()))

        it('should return true for identical values', () => {
            fc.assert(
                fc.property(fc.anything(), (value) => {
                    expect(isDeepEqual(value, value)).toBeTruthy()
                })
            )
        })

        it('should return true for arrays containing the same values', () => {
            fc.assert(
                fc.property(arrayArbitrary, (array) => {
                    expect(isDeepEqual(array, [...array])).toBeTruthy()
                    expect(isDeepEqual([...array], array)).toBeTruthy()
                })
            )
        })

        it('should return false for arrays containing different values', () => {
            fc.assert(
                fc.property(arrayArbitrary, arrayArbitrary, (arrayA, arrayB) => {
                    // We'll do a very simplified precondition - we'll only run tests when the first elements are different
                    fc.pre(!isDeepEqual(arrayA[0], arrayB[0]))

                    expect(isDeepEqual(arrayA, arrayB)).toBeFalsy()
                    expect(isDeepEqual(arrayB, arrayA)).toBeFalsy()
                })
            )
        })

        it('should return false for arrays containing more values', () => {
            fc.assert(
                fc.property(arrayArbitrary, fc.anything(), (array, extraValue) => {
                    expect(isDeepEqual(array, [...array, extraValue])).toBeFalsy()
                    expect(isDeepEqual([...array, extraValue], array)).toBeFalsy()
                })
            )
        })

        it('should return true for sets containing the same values', () => {
            fc.assert(
                fc.property(arrayArbitrary, (array) => {
                    const setA = new Set(array)
                    const setB = new Set(array)

                    expect(isDeepEqual(setA, setB)).toBeTruthy()
                    expect(isDeepEqual(setB, setA)).toBeTruthy()
                })
            )
        })

        it('should return true for maps containing the same values', () => {
            fc.assert(
                fc.property(entriesArbitrary, (entries) => {
                    const mapA = new Map(entries)
                    const mapB = new Map(entries)

                    expect(isDeepEqual(mapA, mapB)).toBeTruthy()
                    expect(isDeepEqual(mapB, mapA)).toBeTruthy()
                })
            )
        })

        it('should return true for objects containing the same values', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        value: fc.anything(),
                    }),
                    (object) => {
                        expect(isDeepEqual(object, { ...object })).toBeTruthy()
                        expect(isDeepEqual({ ...object }, object)).toBeTruthy()
                    }
                )
            )
        })

        it('should return false for objects containing different values', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        value: fc.anything(),
                    }),
                    fc.anything(),
                    (object, value) => {
                        fc.pre(!isDeepEqual(object.value, value))

                        expect(isDeepEqual(object, { value })).toBeFalsy()
                        expect(isDeepEqual({ value }, object)).toBeFalsy()
                    }
                )
            )
        })
    })
})
