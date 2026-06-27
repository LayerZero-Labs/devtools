import { NIL_CONFIRMATIONS, NIL_DVN_COUNT } from './constants'

/**
 * Resolution of the empty → NIL-sentinel mapping shared by every ULN serializer
 * (ULN302 send/receive and the Read library, across EVM and Solana). The only genuine
 * per-chain variation is how the DVN arrays themselves are encoded, so the count/confirmations
 * resolution lives here to keep the three serializers in lock-step.
 *
 * `useNilSentinels` is `true` for an OApp config (an explicitly-empty field pins the literal
 * zero/none via a sentinel) and `false` for the library-wide DEFAULT config (which rejects
 * NIL sentinels on-chain, so empty/zero values stay literal).
 */

/**
 * Resolves a DVN count from a user-config DVN array. Both `requiredDVNs` and `optionalDVNs`
 * are optional, so we distinguish omitted (`undefined` → inherit the on-chain default, count
 * `0`) from explicitly empty (`[]` → pin "no DVNs" via the NIL sentinel under `useNilSentinels`).
 * A concrete array resolves to its length.
 */
export const resolveDVNCount = (dvns: readonly string[] | null | undefined, useNilSentinels: boolean): number =>
    dvns == null ? 0 : dvns.length > 0 ? dvns.length : useNilSentinels ? NIL_DVN_COUNT : 0

/**
 * Inverse of {@link resolveDVNCount} for config generators: given an on-chain DVN count and the
 * DVN array, returns the array a generated config should emit, or `undefined` to OMIT the field
 * (inherit the default). Keeps both generators in lock-step with the serializer's resolution:
 *   - NIL sentinel → `[]` (pin "no DVNs"; re-serializes back to NIL)
 *   - `0` → `undefined` (omit the field; inherits the on-chain default)
 *   - concrete count → the DVN array (null entries filtered out)
 */
export const dvnsFromCount = (count: number, dvns: readonly string[]): string[] | undefined => {
    if (count === NIL_DVN_COUNT) {
        return []
    }
    if (count === 0) {
        return undefined
    }
    return dvns.filter((dvn) => dvn != null)
}

/**
 * An omitted `confirmations` inherits the on-chain default (`0`); an explicit `0n` pins "zero
 * confirmations" via the NIL sentinel under `useNilSentinels`; any other value is literal.
 */
export const resolveConfirmations = (confirmations: bigint | undefined, useNilSentinels: boolean): bigint =>
    confirmations == null
        ? BigInt(0)
        : confirmations === BigInt(0) && useNilSentinels
          ? NIL_CONFIRMATIONS
          : confirmations

/**
 * Resolves (clamps) the optional DVN threshold against the resolved optional DVN count. The
 * contract requires the threshold to be 0 unless there are concrete optional DVNs.
 */
export const resolveOptionalDVNThreshold = (optionalDVNThreshold: number, resolvedOptionalDVNCount: number): number => {
    const hasConcreteOptionalDVNs = resolvedOptionalDVNCount !== 0 && resolvedOptionalDVNCount !== NIL_DVN_COUNT
    return hasConcreteOptionalDVNs ? optionalDVNThreshold : 0
}

/**
 * Validates a library-wide DEFAULT config against the contract's invariants, surfacing a clear
 * error instead of an opaque on-chain revert. Only the DEFAULT-config path calls this — an OApp
 * config may legitimately inherit everything, and its desired-vs-chain diff must never throw.
 *
 * Mirrors `_assertAtLeastOneDVN` (requiredDVNCount 0 AND optionalDVNThreshold 0 reverts) and the
 * separate `optionalDVNThreshold <= optionalDVNCount` invariant. Pass the already-resolved
 * (clamped) threshold.
 */
export const assertValidDefaultConfig = (
    resolvedRequiredDVNCount: number,
    resolvedOptionalDVNCount: number,
    resolvedOptionalDVNThreshold: number
): void => {
    if (resolvedRequiredDVNCount === 0 && resolvedOptionalDVNThreshold === 0) {
        throw new Error(
            'Default ULN config must specify at least one DVN (a required DVN, or optional DVNs with a threshold)'
        )
    }
    if (resolvedOptionalDVNThreshold > resolvedOptionalDVNCount) {
        throw new Error(
            `optionalDVNThreshold (${resolvedOptionalDVNThreshold}) cannot exceed the number of optional DVNs (${resolvedOptionalDVNCount})`
        )
    }
}
