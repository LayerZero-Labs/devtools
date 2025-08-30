import { findAssociatedTokenPda, safeFetchToken } from '@metaplex-foundation/mpl-toolbox'
import { PublicKey, Umi, publicKey } from '@metaplex-foundation/umi'
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import {
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    Mint as Web3Mint,
    getAccountLenForMint,
    unpackMint,
} from '@solana/spl-token'
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

export const SPL_TOKEN_ACCOUNT_RENT_VALUE = 2_039_280 // This figure represents lamports (https://solana.com/docs/references/terminology#lamport) on Solana. Read below for more details.

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
    type WriteFn = (chunk: string | Buffer, ...args: unknown[]) => boolean
    const origWrite = process.stderr.write.bind(process.stderr) as WriteFn
    process.stderr.write = ((chunk: string | Buffer, ...args: unknown[]) => {
        const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
        if (typeof str === 'string' && str.includes('429 Too Many Requests')) {
            // swallow it
            return true
        }
        // otherwise pass through
        return origWrite(chunk, ...args)
    }) as typeof process.stderr.write
}

export enum SolanaTokenType {
    SPL = 'spl',
    TOKEN2022 = 'token2022',
}

/**
 * Check if an Associated Token Account (ATA) exists for a given mint and owner.
 * Returns the derived ATA and a boolean indicating existence.
 */
export async function checkAssociatedTokenAccountExists(args: {
    connection: Connection
    umi: Umi
    mint: PublicKey
    owner: PublicKey
}): Promise<{ ata: string; ataExists: boolean; tokenType: SolanaTokenType | null; mintAccount: Web3Mint }> {
    const { umi, mint, owner, connection } = args

    const mintAccountInfo = await connection.getAccountInfo(toWeb3JsPublicKey(mint))
    if (!mintAccountInfo) throw new Error(`Mint not found: ${mint}`)

    let tokenType: SolanaTokenType
    let tokenProgramId: string
    switch (mintAccountInfo.owner.toBase58()) {
        case TOKEN_PROGRAM_ID.toBase58():
            tokenType = SolanaTokenType.SPL
            tokenProgramId = TOKEN_PROGRAM_ID.toBase58()
            break
        case TOKEN_2022_PROGRAM_ID.toBase58():
            tokenType = SolanaTokenType.TOKEN2022
            tokenProgramId = TOKEN_2022_PROGRAM_ID.toBase58()
            break
        default:
            throw new Error(`Unknown token program: ${mintAccountInfo.owner}`)
    }

    // Derive ATA with the matching token program id.
    const ataPda = findAssociatedTokenPda(umi, {
        mint,
        owner,
        tokenProgramId: publicKey(tokenProgramId),
    })

    const ataPk = ataPda[0]
    const account = await safeFetchToken(umi, ataPk)
    const mintAccount = unpackMint(toWeb3JsPublicKey(mint), mintAccountInfo, mintAccountInfo.owner)

    return { ata: ataPk, ataExists: !!account, tokenType, mintAccount }
}

/**
 * Compute the minimum required per-transaction msg.value to attach when sending to Solana.
 * Returns 0 if the recipient ATA already exists or if the mint is Token2022.
 * Returns SPL_TOKEN_ACCOUNT_RENT_VALUE if the recipient ATA is missing and the mint is SPL.
 */
export async function getMinimumValueForSendToSolana(args: {
    recipient: PublicKey
    mint: PublicKey
    umi: Umi
    connection: Connection
}): Promise<number> {
    const { recipient, mint, umi, connection } = args
    // Note that there may still exist a race condition and stale RPC data issue
    // Race Condition 1: First send to address X on Solana is still in flight, and the second send to address X on Solana is initiated. The second send would evaluate the ATA as not yet created.
    // Stale RPC data issue: The ATA might have been created at t=0, but the RPC will only pick it up at t=X but a send was initiated at t < x.
    const { ata, ataExists, tokenType, mintAccount } = await checkAssociatedTokenAccountExists({
        owner: recipient,
        connection,
        mint,
        umi,
    })
    console.info(`ATA: ${ata}, ATA exists: ${ataExists}, tokenType: ${tokenType}`)
    if (!ataExists) {
        // if the ATA does not exist, we return the minimum value needed for the ATA creation
        if (tokenType === SolanaTokenType.SPL) {
            console.info('ATA does not exist for the recipient and mint is SPL')
            return SPL_TOKEN_ACCOUNT_RENT_VALUE
        } else if (tokenType === SolanaTokenType.TOKEN2022) {
            const tokenAccountSize = getAccountLenForMint(mintAccount)
            const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(tokenAccountSize) // it might be possible for you to avoid this RPC call. refer to https://x.com/0xNazreen/status/1945107841754243570
            return rentExemptLamports
        }
    } else {
        // if the ATA exists, we return 0
        return 0
    }
    return 0
}
