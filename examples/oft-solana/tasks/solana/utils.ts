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
import { AccountInfo, Connection } from '@solana/web3.js'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

export const SPL_TOKEN_ACCOUNT_RENT_VALUE = 2_039_280 // This figure represents lamports (https://solana.com/docs/references/terminology#lamport) on Solana. Read below for more details.

const logger = createLogger()

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
 * Get the mint account info for a given mint, for use by the functions `checkAssociatedTokenAccountExists` and ...
 */
export async function getMintAccountInfo(args: {
    connection: Connection
    mint: PublicKey
}): Promise<{ mintAccountInfo: AccountInfo<Buffer>; mintAccount: Web3Mint }> {
    const { connection, mint } = args
    const mintAccountInfo = await connection.getAccountInfo(toWeb3JsPublicKey(mint))
    if (!mintAccountInfo) throw new Error(`Mint not found: ${mint}`)
    const mintAccount = unpackMint(toWeb3JsPublicKey(mint), mintAccountInfo, mintAccountInfo.owner) // this is done for SPL accounts too, but that's fine since this isn't an RPC call
    return { mintAccountInfo, mintAccount }
}

/**
 * Check if an Associated Token Account (ATA) exists for a given mint and owner.
 * Returns the derived ATA and a boolean indicating existence.
 */
export async function checkAssociatedTokenAccountExists(args: {
    connection: Connection
    umi: Umi
    mint: PublicKey
    mintAccountInfo: AccountInfo<Buffer>
    owner: PublicKey
}): Promise<{ ata: PublicKey; ataExists: boolean; tokenType: SolanaTokenType }> {
    const { umi, mintAccountInfo, owner, mint } = args

    let tokenType: SolanaTokenType
    let tokenProgramId: string

    // check tokenType and tokenProgramId
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
    const ataAccount = await safeFetchToken(umi, ataPk)

    return { ata: ataPk, ataExists: !!ataAccount, tokenType }
}

/**
 * Compute the minimum required per-transaction msg.value to attach when sending to Solana.
 * Returns 0 if the recipient ATA already exists
 * Returns SPL_TOKEN_ACCOUNT_RENT_VALUE if the recipient ATA is missing and the mint is SPL.
 */
export async function getMinimumValueForSendToSolana(args: {
    recipient: PublicKey
    mint: PublicKey
    umi: Umi
    connection: Connection
}): Promise<number> {
    const { recipient, mint, umi, connection } = args
    const { mintAccountInfo, mintAccount } = await getMintAccountInfo({ connection, mint })
    // Note that there may still exist a race condition and stale RPC data issue
    // Race Condition 1: First send to address X on Solana is still in flight, and the second send to address X on Solana is initiated. The second send would evaluate the ATA as not yet created.
    // Stale RPC data issue: The ATA might have been created at t=0, but the RPC will only pick it up at t=X but a send was initiated at t < x.
    const { ata, ataExists, tokenType } = await checkAssociatedTokenAccountExists({
        owner: recipient,
        connection,
        mint,
        mintAccountInfo,
        umi,
    })
    logger.info(`ATA: ${ata}, ATA exists: ${ataExists}, tokenType: ${tokenType}`)

    if (ataExists) {
        return 0
    }

    switch (tokenType) {
        // if the ATA does not exist, we return the minimum value needed for the ATA creation
        case SolanaTokenType.SPL:
            logger.info('ATA does not exist for the recipient and mint is SPL')
            return SPL_TOKEN_ACCOUNT_RENT_VALUE
        case SolanaTokenType.TOKEN2022: {
            logger.info('ATA does not exist for the recipient and mint is TOKEN2022')
            const rentExemptLamports = await getMinimumRentForToken2022TokenAccount({ connection, mintAccount })
            return rentExemptLamports
        }
        default:
            throw new Error(`Unknown token type: ${tokenType}`)
    }
}

async function getMinimumRentForToken2022TokenAccount(args: {
    connection: Connection
    mintAccount: Web3Mint
}): Promise<number> {
    const { connection, mintAccount } = args
    const tokenAccountSize = getAccountLenForMint(mintAccount)
    const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(tokenAccountSize)
    return rentExemptLamports
}
