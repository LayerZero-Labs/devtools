import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type Bytes32 = string

export type Bytes20 = string

export type Bytes = string

export type PossiblyBigInt = string | number | bigint

export type OmniAddress = Bytes32 | Bytes20

export type PossiblyBytes = Bytes | Bytes32 | Bytes20 | Uint8Array

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

export type RpcUrlFactory = EndpointBasedFactory<string>

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
    [P in keyof T]: T[P] extends Exclude<T[P], NonNullable<unknown> | null> ? never : undefined extends T[P] ? never : P
}[keyof T]

/**
 * Helper type that turns all properties defined as unknown or undefined
 * into optional properties
 */
export type WithOptionals<T> = Partial<T> & Pick<T, GetMandatoryKeys<T>>

/**
 * Helper type for loosening the user configuration types
 * when it comes to `bigint`s.
 *
 * It will recursively replace all the `bigint` types,
 * preserving the types structure, with `PossiblyBigInt` type.
 *
 * ```
 * interface Config {
 *   values: bigint[]
 * }
 *
 * type UserConfig = WithLooseBigInts<Config>
 *
 * const userConfig: UserConfig = {
 *   values: ["124", 124, BigInt(124)]
 * }
 * ```
 */
export type WithLooseBigInts<T> = T extends bigint
    ? PossiblyBigInt
    : T extends Set<bigint>
      ? Set<PossiblyBigInt>
      : T extends Map<infer K, infer V>
        ? Map<WithLooseBigInts<K>, WithLooseBigInts<V>>
        : T extends { [K in keyof T]: T[K] }
          ? { [K in keyof T]: WithLooseBigInts<T[K]> }
          : T extends Promise<infer V>
            ? Promise<WithLooseBigInts<V>>
            : T
