import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type Address = string

export type Bytes32 = string

export type EndpointBasedFactory<TValue> = (eid: EndpointId) => TValue | Promise<TValue>

/**
 * Helper type that grabs all the keys of a type / an interface
 * that are not defined as undefined or unknown
 *
 * ```typescript
 * interface A {
 *   nown: string;
 *   unown: unknown
 *   udefned: undefined
 *   noll: null
 * }
 *
 * // Will be 'nown' | 'noll'
 * type MandatoryKeysOFA = GetMandatoryKeys<A>
 * ```
 */
type GetMandatoryKeys<T> = {
    [P in keyof T]: T[P] extends Exclude<T[P], NonNullable<unknown> | null> ? never : P
}[keyof T]

/**
 * Helper type that turns all properties defined as unknown or undefined
 * into optional properties
 */
export type WithOptionals<T> = Partial<T> & Pick<T, GetMandatoryKeys<T>>
