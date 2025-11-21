import { OmniTransactionWithReceipt, OmniTransactionWithError, OmniTransaction } from './types'

export type SignAndSendResult = [
    // All the successful transactions
    successful: OmniTransactionWithReceipt[],
    // The failed transactions along with the errors
    errors: OmniTransactionWithError[],
    // All the transactions that have not been executed (including the failed ones)
    pending: OmniTransaction[],
]

export type OnSignAndSendProgress = (
    result: OmniTransactionWithReceipt,
    results: OmniTransactionWithReceipt[]
) => unknown

export type SignAndSend = (
    transactions: OmniTransaction[],
    onProgress?: OnSignAndSendProgress
) => Promise<SignAndSendResult>
