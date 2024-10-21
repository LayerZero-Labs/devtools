import { TOKEN_PROGRAM_ID, createMultisig } from '@solana/spl-token'
import { Connection, PublicKey, Signer } from '@solana/web3.js'

/**
 * Creates a (1/N) multisig account for use as the mint authority.
 * @param connection {Connection}
 * @param payer {Signer}
 * @param oftStorePda {PublicKey}
 * @param tokenProgramId {PublicKey} defaults to SPL token program ID
 */
export const createMintAuthorityMultisig = async (
    connection: Connection,
    payer: Signer,
    oftStorePda: PublicKey,
    tokenProgramId: PublicKey = TOKEN_PROGRAM_ID
) => {
    return createMultisig(
        connection,
        payer,
        [oftStorePda, payer.publicKey],
        1, // quorum 1/N
        undefined,
        {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
        },
        tokenProgramId
    )
}
