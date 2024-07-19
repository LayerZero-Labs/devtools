import { Message, Transaction } from '@solana/web3.js'

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
