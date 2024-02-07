import { deepStrictEqual } from 'assert'

/**
 * Compares two object by value, returning `true` if they match
 *
 * ```
 * const theyMatch = isDeepEqual({ a: 1 }, { a: 1 }) // true
 * const theyDontMatch = isDeepEqual({ a: 1 }, { a: '1' }) // false
 * ```
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export const isDeepEqual = (a: unknown, b: unknown): boolean => {
    try {
        return deepStrictEqual(a, b), true
    } catch {
        return false
    }
}
