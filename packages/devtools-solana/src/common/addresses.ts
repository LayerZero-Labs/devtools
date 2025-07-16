import { DebugLogger, KnownErrors } from '@layerzerolabs/io-devtools'
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import { PROGRAM_ID as SQUADS_PROGRAM_ID } from '@sqds/multisig'

/**
 * Returns true if the provided address is a valid on-curve public key. This can mean the address is either a 'regular' Solana address or a Squads Vault PDA.
 */
export function isOnCurveAddress(address: string): boolean {
    try {
        return PublicKey.isOnCurve(new PublicKey(address).toBytes())
    } catch {
        return false
    }
}

/**
 * Returns true if the provided address could be a Squads vault PDA.
 */
export async function isPossibleSquadsVault(connection: Connection, address: string): Promise<boolean> {
    try {
        const pubkey = new PublicKey(address)
        const accountInfo = await connection.getAccountInfo(pubkey)

        return accountInfo != null && accountInfo.owner.equals(SystemProgram.programId)
    } catch (error) {
        return false
    }
}

export async function assertValidSolanaAdmin(connection: Connection, address: string): Promise<void> {
    const pubkey = new PublicKey(address)

    try {
        const accountInfo = await connection.getAccountInfo(pubkey)

        if (accountInfo != null && accountInfo.owner.equals(SQUADS_PROGRAM_ID)) {
            DebugLogger.printErrorAndFixSuggestion(KnownErrors.SOLANA_OWNER_OR_DELEGATE_CANNOT_BE_MULTISIG_ACCOUNT)
            throw new Error(
                `Invalid owner/delegate address ${address}. This is a Squads multisig account. Use the vault address instead.`
            )
        }

        if (!isOnCurveAddress(address) && !(await isPossibleSquadsVault(connection, address))) {
            DebugLogger.printErrorAndFixSuggestion(KnownErrors.SOLANA_INVALID_OWNER_OR_DELEGATE)
            throw new Error(
                `Invalid owner/delegate address ${address}. Must be a valid on-curve address or a Squads Vault PDA.`
            )
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }
        throw new Error(String(error))
    }
}
