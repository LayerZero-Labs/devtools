import { Message, Transaction } from '@solana/web3.js'

export const serializeTransactionMessage = (transaction: Transaction): string =>
    serializeTransactionBuffer(transaction.serializeMessage())

export const deserializeTransactionMessage = (data: string): Transaction =>
    Transaction.populate(Message.from(deserializeTransactionBuffer(data)))

export const serializeTransactionBuffer = (buffer: Buffer): string => buffer.toString('hex')

export const deserializeTransactionBuffer = (data: string): Buffer => Buffer.from(data, 'hex')
