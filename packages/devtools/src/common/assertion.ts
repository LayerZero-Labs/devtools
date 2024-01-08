import { deepStrictEqual } from 'assert'

/**
 * Compares two object by value, returning `true` if they match
 *
 * ```
 * const theyMatch = isDeepEqual({ a: 1 }, { a: 1 }) // true
 * const theyDontMatch = isDeepEqual({ a: 1 }, { a: '1' }) // false
 * ```
 *
 * @param {T} a
 * @param {unknown} b
 * @returns {boolean}
 */
export const isDeepEqual = <T>(a: T, b: unknown): b is T => {
    try {
        return deepStrictEqual(a, b), true
    } catch {
        return false
    }
}
