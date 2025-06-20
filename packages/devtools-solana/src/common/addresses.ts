import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import { PROGRAM_ID as SQUADS_PROGRAM_ID } from '@sqds/multisig'

/**
 * Returns true if the provided address is a valid on-curve public key.
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
 *
 * Due to lack of context to derive the exact PDA seeds, this implementation
 * treats any off-curve address as a possible vault address.
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
            throw new Error(
                `Invalid admin address ${address}. This is a Squads multisig account. Use the vault address instead.`
            )
        }

        if (!isOnCurveAddress(address) && !(await isPossibleSquadsVault(connection, address))) {
            throw new Error(`Invalid admin address ${address}. Must be an on curve address or a Squads vault PDA`)
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }
        throw new Error(String(error))
    }
}
