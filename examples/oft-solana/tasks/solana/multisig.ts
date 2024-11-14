import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createMultisig } from '@solana/spl-token'
import { Connection, PublicKey, Signer } from '@solana/web3.js'
import { backOff } from 'exponential-backoff'

/**
 * Creates a (1/N) multisig account for use as the mint authority.
 * @param connection {Connection}
 * @param payer {Signer}
 * @param oftStorePda {PublicKey} will be included as a signer
 * @param tokenProgramId {PublicKey} defaults to SPL token program ID
 * @param additionalSigners {PublicKey[]} the additionalSigners for the multisig account
 */
export const createMintAuthorityMultisig = async (
    connection: Connection,
    payer: Signer,
    oftStorePda: PublicKey,
    tokenProgramId: PublicKey = TOKEN_PROGRAM_ID,
    additionalSigners: PublicKey[]
) => {
    return createMultisig(
        connection,
        payer,
        [oftStorePda, ...additionalSigners],
        1, // quorum 1/N
        undefined,
        {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
        },
        tokenProgramId
    )
}

/**
 * Decode the signers of a multisig account and check if the expected signers
 * are present and the quorum is 1/N.
 * @param connection {Connection}
 * @param multisigAddress {PublicKey}
 * @param expectedSigners {PublicKey[]} the expected signers
 */
export const checkMultisigSigners = async (
    connection: Connection,
    multisigAddress: PublicKey,
    expectedSigners: PublicKey[]
) => {
    // Fetch account info for the multisig.  "undefined" is treated as an error.
    const accountInfo = await backOff(
        async () => {
            const accountInfo = await connection.getAccountInfo(multisigAddress)
            if (!accountInfo) {
                throw new Error('Multisig account not found')
            }
            return accountInfo
        },
        {
            maxDelay: 30000,
            numOfAttempts: 10,
            startingDelay: 5000,
        }
    )

    if (!accountInfo.owner.equals(TOKEN_PROGRAM_ID) && !accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        throw new Error('Provided address is not an SPL Token multisig account')
    }

    // Multisig accounts have a specific layout based on the Multisig interface:
    const data = accountInfo.data

    // Extract the number of required signers (m) and total possible signers (n)
    const numRequiredSigners = data[0]
    const numTotalSigners = data[1]

    if (numRequiredSigners !== 1) {
        throw new Error('Multisig account must have 1 required signer')
    }

    // Initialize an array to hold the signers
    const signers: PublicKey[] = []

    // Extract each signer public key based on the Multisig interface
    const signerOffset = 3 // Offset to the first signer in the data
    const signerSize = 32 // Each signer address is 32 bytes

    for (let i = 0; i < numTotalSigners; i++) {
        const start = signerOffset + i * signerSize
        const end = start + signerSize
        const signerPublicKey = new PublicKey(data.slice(start, end))
        if (!signerPublicKey.equals(PublicKey.default)) {
            signers.push(signerPublicKey)
        }
    }

    for (const signer of expectedSigners) {
        if (!signers.find((s) => s.toBase58() == signer.toBase58())) {
            throw new Error(`Signer ${signer.toBase58()} not found in multisig account`)
        }
    }
    return signers
}
