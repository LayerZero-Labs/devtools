import { DebugLogger, KnownErrors, createModuleLogger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import { PROGRAM_ID as SQUADS_PROGRAM_ID } from '@sqds/multisig'

const createLogger = () => createModuleLogger('Solana addresses')

/**
 * Returns true if the provided address is a valid on-curve public key. This can mean the address is either a 'regular' Solana address or a Squads Vault PDA.
 */
export function isOnCurveAddress(address: string): boolean {
    const logger = createLogger()
    try {
        const result = PublicKey.isOnCurve(new PublicKey(address).toBytes())
        logger.debug(`[isOnCurveAddress] address=${address} onCurve=${result}`)
        return result
    } catch {
        logger.debug(`[isOnCurveAddress] address=${address} invalid public key`)
        return false
    }
}

/**
 * Checks if an address is a Squads V4 vault using the Squads API.
 * Only works on Solana mainnet (30168). Returns null for testnet (40168).
 * Throws for any other EID.
 */
export async function isSquadsV4Vault(eid: EndpointId, address: string): Promise<boolean | null> {
    const logger = createLogger()

    if (eid === EndpointId.SOLANA_V2_TESTNET) {
        logger.debug(`[isSquadsV4Vault] eid=${eid} is testnet, returning null (API only works on mainnet)`)
        return null
    }

    if (eid !== EndpointId.SOLANA_V2_MAINNET) {
        throw new Error(`[isSquadsV4Vault] unsupported eid=${eid}, only Solana mainnet (30168) is supported`)
    }

    // https://docs.squads.so/main/development/api/vault-check
    // Note that this endpoint is rate-limited to 25 requests per minute. It's fine if run on end-dev side but if run on a backend, it should be cached.
    const response = await fetch(
        `https://4fnetmviidiqkjzenwxe66vgoa0soerr.lambda-url.us-east-1.on.aws/isSquad/${address}`
    )
    const data = await response.json()
    logger.debug(
        `[isSquadsV4Vault] address=${address} isSquad=${data?.isSquad} version=${data?.version} status=${response.status}`
    )
    if (data.isSquad && data.version != 'v4') {
        logger.warn(`${address} is a Squads Vault but not v4`)
        return false
    } else if (data.isSquad && data.version === 'v4') {
        return true
    } else {
        return false
    }
}

/**
 * Validates that an address is acceptable as a Solana admin (owner/delegate).
 *
 * Throws if:
 * - Address is off-curve AND account exists AND account is owned by Squads Program
 *   (This means it's a Squads Multisig account, not the vault address)
 *
 * Does NOT throw (valid) if:
 * - Address is on-curve (regular Solana address)
 * - Address is off-curve AND account exists AND account is owned by System Program (funded Squads Vault)
 * - Address is off-curve AND account does not exist (possibly unfunded Squads Vault)
 */
export async function assertValidSolanaAdmin(connection: Connection, address: string): Promise<void> {
    const logger = createLogger()
    const pubkey = new PublicKey(address)

    try {
        logger.debug(`[assertValidSolanaAdmin] start address=${address}`)
        const accountInfo = await connection.getAccountInfo(pubkey)
        const isOnCurve = isOnCurveAddress(address)

        // if onCurve (regular address), always valid
        if (isOnCurve) {
            logger.debug(`[assertValidSolanaAdmin] address=${address} valid: on-curve (regular address)`)
            return
        } else {
            // if offCurve
            const accountExists = accountInfo != null
            if (accountExists) {
                // here it could either be a funded Squads Vault account or a Squads Multisig account
                const ownedBySquadsProgram = accountInfo?.owner.equals(SQUADS_PROGRAM_ID)
                const ownedBySystemProgram = accountInfo?.owner.equals(SystemProgram.programId)
                if (ownedBySquadsProgram) {
                    logger.debug(
                        `[assertValidSolanaAdmin] address=${address} invalid: off-curve, account exists, owned by Squads Program (multisig account)`
                    )
                    DebugLogger.printErrorAndFixSuggestion(
                        KnownErrors.SOLANA_OWNER_OR_DELEGATE_CANNOT_BE_MULTISIG_ACCOUNT
                    )
                    throw new Error(
                        `Invalid owner/delegate address ${address}. This is a Squads multisig account. Use the vault address instead.`
                    )
                } else if (ownedBySystemProgram) {
                    logger.debug(
                        `[assertValidSolanaAdmin] address=${address} valid: off-curve, account exists, owned by System Program (funded Squads Vault)`
                    )
                    return
                }
            } else {
                logger.debug(
                    `[assertValidSolanaAdmin] address=${address} valid: off-curve, account does not exist (possibly unfunded Squads Vault)`
                )
                return
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }
        throw new Error(String(error))
    }
}
