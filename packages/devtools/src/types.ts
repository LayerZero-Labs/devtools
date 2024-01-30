import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type Address = string

export type Bytes32 = string

export type Bytes = string

export type PossiblyBigInt = string | number | bigint

export type OmniAddress = Bytes32 | Address

export type PossiblyBytes = Bytes | Bytes32 | Address

/**
 * Generic type for a hybrid (sync / async) factory
 * that generates an instance of `TOutput` based on arguments of type `TInput`
 *
 * `TInput` represents the list of all function arguments that need to be passed to the factory:
 *
 * ```typescript
 * const mySyncFactory: Factory<[number, boolean], string> = (num: number, bool: boolean): string => "hello"
 *
 * const mySyncFactory: Factory<[], string> = async () => "hello"
 * ```
 *
 * The hybrid aspect just makes it easier for implementers - if the logic is synchronous,
 * this type will not force any extra `async`.
 */
export type Factory<TInput extends unknown[], TOutput> = (...input: TInput) => TOutput | Promise<TOutput>

export type EndpointBasedFactory<TValue> = Factory<[eid: EndpointId], TValue>

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
