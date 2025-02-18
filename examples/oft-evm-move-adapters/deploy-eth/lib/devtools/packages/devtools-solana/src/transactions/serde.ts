import { Message, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'

export const serializeTransactionMessage = (transaction: Transaction): string =>
    serializeTransactionBuffer(transaction.serializeMessage())

export const deserializeTransactionMessage = (data: string): Transaction =>
    Transaction.populate(Message.from(deserializeTransactionBuffer(data)))

/**
 * Helper utility to serialize a generic Solana buffer to string
 *
 * This encapsulates Buffer serialization for various uses
 * to prevent it from creeping into more and more places
 * and potentially getting out of sync.
 *
 * @param {Buffer} buffer
 * @returns {string}
 */
export const serializeTransactionBuffer = (buffer: Buffer): string => buffer.toString('hex')

/**
 * Helper utility to deserialize a serialized generic Solana buffer back to a buffer
 *
 * This encapsulates Buffer serialization for various uses
 * to prevent it from creeping into more and more places
 * and potentially getting out of sync.
 *
 * @param {string} data Serialized Solana `Buffer`
 * @returns {Buffer}
 */
export const deserializeTransactionBuffer = (data: string): Buffer => Buffer.from(data, 'hex')

/**
 * Roughly estimates the transaction size and returns the size in bytes.
 *
 * This is only an approximation and should be used with caution (and love and understanding)
 *
 * @param {Transaction} transaction
 * @param {number} [numSigners]
 * @returns {number}
 */
export const estimateTransactionSize = (transaction: Transaction, numSigners: number = 1): number => {
    const originalFeePayer = transaction.feePayer
    const originalRecentBlockHash = transaction.recentBlockhash

    try {
        transaction.feePayer = new PublicKey(0)
        transaction.recentBlockhash = new PublicKey(0).toBase58()

        const serialized = transaction.serialize({
            verifySignatures: false,
            requireAllSignatures: false,
        })

        return (
            serialized.length +
            // 1 byte for the number of signatures.
            1 +
            // 64 bytes per each signer. We'll default the number of signers to 1
            numSigners * 64
        )
    } finally {
        transaction.feePayer = originalFeePayer
        transaction.recentBlockhash = originalRecentBlockHash
    }
}

/**
 * Estimates the size of a transaction with an additional instruction added.
 *
 * Returns `true` if the transaction with the additional instruction fits the size limit,
 * `false` otherwise.
 *
 * Since the transaction size on Solana also depends on the number of signers,
 * we allow this number to be overriden.
 *
 * @param {Transaction} transaction
 * @param {TransactionInstruction} instruction
 * @param {number} [numSigners]
 *
 * @returns {boolean}
 */
export const canAddInstruction = (
    transaction: Transaction,
    instruction: TransactionInstruction,
    numSigners: number = 1
): boolean => {
    const measure = new Transaction().add(...transaction.instructions, instruction)
    const size = estimateTransactionSize(measure, numSigners)

    return size < MAX_TRANSACTION_SIZE - TRANSACTION_SIZE_BUFFER
}

const MAX_TRANSACTION_SIZE = 1232

let TRANSACTION_SIZE_BUFFER = 64

/**
 * Developer helper to adjust the buffer we add when estimating transaction sizes
 *
 * Since the size estimation algorhytm is only an approximation,
 * we use this buffer to offset the maximum transaction size we allow in one transaction.
 *
 * If set to a positive value, this will make less instructions fit into one transaction.
 * If set to a negative value, it will make more instructions fit into one transaction.
 *
 * The default value for this buffer is 64
 *
 * @see {canAddInstruction}
 * @param {number} value
 */
export const setTransactionSizeBuffer = (value: number) => {
    TRANSACTION_SIZE_BUFFER = value
}
