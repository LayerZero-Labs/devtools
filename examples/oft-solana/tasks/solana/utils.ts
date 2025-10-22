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
 * Computes the maximum whole-token supply representable by a Solana SPL mint
 * given its local decimal precision, formatted for readability.
 *
 * Behavior:
 * - Uses compact units when large enough: K (thousand), M (million), B (billion), T (trillion).
 * - Values < 1000 are returned as a plain whole number string without a suffix.
 * - Rounds "half up" to the provided display precision.
 * - Near unit boundaries, rounding can promote the value to the next unit
 *   (e.g., 999.6B -> 1.0T) which matches typical human-readable expectations.
 *
 * Parameters:
 * - localDecimals: Non-negative integer count of decimals on the SPL mint.
 * - maxDisplayDecimals: Fractional digits to include in the compact representation (0–6). Default is 1.
 *
 * Returns:
 * - A human-readable string such as "18.4B", "1.0T", or "842".
 *
 * Throws:
 * - If localDecimals is negative or not an integer.
 * - If maxDisplayDecimals is not an integer in the inclusive range [0, 6].
 *
 * Examples:
 * - maxSupplyWholeTokens(9)  -> "18.4B"   // typical 9-decimal mint
 * - maxSupplyWholeTokens(12) -> "18.4M"
 * - maxSupplyWholeTokens(18) -> "18"      // < 1K, returned as a plain number
 */
export function localDecimalsToMaxSupplyWholeTokens(localDecimals: number, maxDisplayDecimals = 1) {
    if (!Number.isInteger(localDecimals) || localDecimals < 0) {
        throw new Error('localDecimals must be a non-negative integer')
    }
    if (!Number.isInteger(maxDisplayDecimals) || maxDisplayDecimals < 0 || maxDisplayDecimals > 6) {
        throw new Error('precision must be an integer between 0 and 6')
    }

    const denom = 10n ** BigInt(localDecimals)
    const whole = U64_MAX / denom // whole-token cap

    // choose largest unit that fits
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
