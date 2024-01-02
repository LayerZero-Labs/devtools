import { printRecord } from '@layerzerolabs/io-devtools'
import { OmniTransaction } from './types'

/**
 * Placeholder for a more detailed OmniTransaction printer
 *
 * @param {OmniTransaction} transaction
 * @returns {string}
 */
export const printTransaction = (transaction: OmniTransaction): string => printRecord(transaction)

/**
 * Placeholder for a more detailed OmniTransaction list printer
 *
 * @param {OmniTransaction[]} transactions
 * @returns {string}
 */
export const printTransactions = (transactions: OmniTransaction[]): string =>
    printRecord(transactions.map(printTransaction))
