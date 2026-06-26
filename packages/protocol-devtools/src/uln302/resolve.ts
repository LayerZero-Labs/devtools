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
 * `requiredDVNs` is mandatory on the user config, so an empty array is the only "none" signal.
 * An explicit `requiredDVNCount` override always wins (e.g. `0` forces the inherit case);
 * otherwise the count is the array length, or the NIL sentinel for an empty array under
 * `useNilSentinels`.
 */
export const resolveRequiredDVNCount = (
    requiredDVNs: readonly string[],
    requiredDVNCount: number | undefined,
    useNilSentinels: boolean
): number => requiredDVNCount ?? (requiredDVNs.length > 0 ? requiredDVNs.length : useNilSentinels ? NIL_DVN_COUNT : 0)

/**
 * `optionalDVNs` is optional, so we distinguish omitted (`undefined` → inherit the on-chain
 * default, count `0`) from explicitly empty (`[]` → pin "no optional DVNs" via the NIL sentinel
 * under `useNilSentinels`).
 */
export const resolveOptionalDVNCount = (
    optionalDVNs: readonly string[] | null | undefined,
    useNilSentinels: boolean
): number =>
    optionalDVNs == null ? 0 : optionalDVNs.length > 0 ? optionalDVNs.length : useNilSentinels ? NIL_DVN_COUNT : 0

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
