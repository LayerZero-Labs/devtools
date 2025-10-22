import { Connection } from '@solana/web3.js'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

export const findSolanaEndpointIdInGraph = async (
    hre: HardhatRuntimeEnvironment,
    oappConfig: string
): Promise<EndpointId> => {
    if (!oappConfig) throw new Error('Missing oappConfig')

    let graph: OAppOmniGraph
    try {
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }

    let solanaEid: EndpointId | null = null

    const checkSolanaEndpoint = (eid: EndpointId) => {
        if (endpointIdToChainType(eid) === ChainType.SOLANA) {
            if (solanaEid && solanaEid !== eid) {
                throw new Error(`Multiple Solana Endpoint IDs found: ${solanaEid}, ${eid}`)
            }
            solanaEid = eid
        }
    }

    for (const { vector } of graph.connections) {
        checkSolanaEndpoint(vector.from.eid)
        checkSolanaEndpoint(vector.to.eid)
        if (solanaEid) return solanaEid
    }

    throw new Error('No Solana Endpoint ID found. Ensure your OApp configuration includes a valid Solana endpoint.')
}

/**
 * Turn a human decimal amount (e.g. "1.234") into a BigInt of base‐units given `decimals`.
 */
export function parseDecimalToUnits(amount: string, decimals: number): bigint {
    const [whole, fraction = ''] = amount.split('.')
    const wholeUnits = BigInt(whole) * 10n ** BigInt(decimals)
    // pad or trim the fractional part to exactly `decimals` digits
    const fracUnits = BigInt(
        fraction
            .padEnd(decimals, '0') // "23"  → "230000"
            .slice(0, decimals) // in case user typed more digits than `decimals`
    )
    return wholeUnits + fracUnits
}

/**
 * Suppresses Solana‐web3.js "429 Too Many Requests" retry spam
 * by intercepting stderr.write and dropping any chunk
 * that mentions the 429 retry.
 */
export function silenceSolana429(connection: Connection): void {
    const origWrite = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: any, ...args: any[]) => {
        const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
        if (typeof str === 'string' && str.includes('429 Too Many Requests')) {
            // swallow it
            return true
        }
        // otherwise pass through
        return origWrite(chunk, ...args)
    }) as typeof process.stderr.write
}
// Max whole-token supply on Solana (u64) formatted as "XB" or "Y.YT"
const U64_MAX = (1n << 64n) - 1n
const UNITS = [
    { base: 1000000000000n, suffix: 'T' },
    { base: 1000000000n, suffix: 'B' },
    { base: 1000000n, suffix: 'M' },
    { base: 1000n, suffix: 'K' },
]
/**
 * Compute the maximum whole-token supply for a Solana SPL mint given its
 * local decimal precision.
 *
 * - Uses the u64 max value ((1 << 64) - 1) divided by the scaling factor
 *   10^localDecimals to derive the whole-token cap.
 * - Returns the whole-token cap as a bigint.
 *
 * @param localDecimals Non-negative integer count of decimals on the SPL mint.
 * @returns bigint Whole-token maximum supply.
 * @throws Error if localDecimals is not a non-negative integer.
 */
export function localDecimalsToMaxSupply(localDecimals: number): bigint {
    if (!Number.isInteger(localDecimals) || localDecimals < 0) {
        throw new Error('localDecimals must be a non-negative integer')
    }
    const scalingFactor = 10n ** BigInt(localDecimals)
    return U64_MAX / scalingFactor
}

/**
 * Format a whole-token amount into a compact human-readable string using
 * unit suffixes: K (thousand), M (million), B (billion), T (trillion).
 *
 * Behavior:
 * - Values < 1000 are returned as a plain whole number string (no suffix).
 * - Rounds half up to the requested precision.
 * - At boundaries, rounding may promote to the next unit (e.g., 999.6B → 1.0T).
 *
 * @param whole The whole-token quantity to format.
 * @param maxDisplayDecimals Fractional digits to include (0–6). Default 1.
 * @returns Human-readable string such as "18.4B", "1.0T", or "842".
 * @throws Error if maxDisplayDecimals is not an integer in [0, 6].
 */
export function formatAmount(whole: bigint, maxDisplayDecimals = 1): string {
    if (!Number.isInteger(maxDisplayDecimals) || maxDisplayDecimals < 0 || maxDisplayDecimals > 6) {
        throw new Error('precision must be an integer between 0 and 6')
    }

    for (let i = 0; i < UNITS.length; i++) {
        const { base, suffix } = UNITS[i]
        if (whole >= base) {
            const pow = 10n ** BigInt(maxDisplayDecimals)
            // round half up at the requested precision
            let scaled = (whole * pow + base / 2n) / base
            let intPart = scaled / pow

            // if rounding pushes us to 1000 of this unit, bump to the next larger (e.g., 999.6B -> 1.0T)
            if (intPart >= 1000n && i === 1) {
                // B -> T
                const higher = UNITS[0]
                scaled = (whole * pow + higher.base / 2n) / higher.base
                intPart = scaled / pow
                const frac = scaled % pow
                const fracStr =
                    maxDisplayDecimals === 0 ? '' : frac.toString().padStart(maxDisplayDecimals, '0').replace(/0+$/, '')
                return fracStr ? `${intPart}.${fracStr}${higher.suffix}` : `${intPart}${higher.suffix}`
            }

            const frac = scaled % pow
            const fracStr =
                maxDisplayDecimals === 0 ? '' : frac.toString().padStart(maxDisplayDecimals, '0').replace(/0+$/, '')
            return fracStr ? `${intPart}.${fracStr}${suffix}` : `${intPart}${suffix}`
        }
    }

    // < 1K -> show plain whole number
    return whole.toString()
}
