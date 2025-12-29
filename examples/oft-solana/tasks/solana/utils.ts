import { Umi, publicKey } from '@metaplex-foundation/umi'
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Connection, PublicKey } from '@solana/web3.js'
import * as multisig from '@sqds/multisig'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver, EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
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

/**
 * Fetches the admin and delegate for a given OFT Store.
 * @param umi - The Umi instance
 * @param connection - The Solana connection
 * @param oftStoreAddress - The OFT Store address as a string
 * @returns An object containing the admin and delegate addresses
 */
export async function getOftAdminAndDelegate(
    umi: Umi,
    connection: Connection,
    oftStoreAddress: string
): Promise<{ admin: string; delegate: string | undefined }> {
    const oftStore = publicKey(oftStoreAddress)

    const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, oftStore)
    const admin = oftStoreInfo.admin.toString()

    const epDeriver = new EndpointPDADeriver(EndpointProgram.PROGRAM_ID)
    const [oAppRegistry] = epDeriver.oappRegistry(toWeb3JsPublicKey(oftStore))
    const oAppRegistryInfo = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(connection, oAppRegistry)
    const delegate = oAppRegistryInfo?.delegate?.toBase58()

    return { admin, delegate }
}

/**
 * Derives the signing authority from the user account and optional multisig key,
 * then checks if it matches the OFT's admin/delegate. Returns any warnings.
 */
export async function validateSigningAuthority(
    umi: Umi,
    connection: Connection,
    oftStoreAddress: string,
    userAccount: PublicKey,
    multisigKey?: PublicKey
): Promise<{ signingAuthority: string; warnings: string[] }> {
    const { admin, delegate } = await getOftAdminAndDelegate(umi, connection, oftStoreAddress)

    let signingAuthority: string
    if (multisigKey) {
        const [vaultPda] = multisig.getVaultPda({ multisigPda: multisigKey, index: 0 })
        signingAuthority = vaultPda.toBase58()
    } else {
        signingAuthority = userAccount.toBase58()
    }

    const warnings: string[] = []
    if (signingAuthority !== admin) {
        warnings.push(
            `Signing authority (${signingAuthority}) is not the admin (${admin}). ` +
                `Use the correct keypair or supply the correct value for    --multisig-key if the admin is a Squads Vault.`
        )
    }
    if (signingAuthority !== delegate) {
        warnings.push(
            `Signing authority (${signingAuthority}) is not the delegate (${delegate}). ` +
                `Use the correct keypair or supply the correct value for --multisig-key if the delegate is a Squads Vault.`
        )
    }

    return { signingAuthority, warnings }
}
