import { Connection, PublicKey } from '@solana/web3.js'
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

        return accountInfo != null && accountInfo.owner.equals(SQUADS_PROGRAM_ID)
    } catch {
        return false
    }
}

export async function assertValidSolanaAdmin(connection: Connection, address: string): Promise<void> {
    if (!isOnCurveAddress(address) && !(await isPossibleSquadsVault(connection, address))) {
        throw new Error(`Invalid admin address ${address}. Must be an on curve address or a Squads vault PDA`)
    }
}
