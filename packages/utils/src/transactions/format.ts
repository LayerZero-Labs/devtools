import { printRecord } from '@layerzerolabs/io-utils'
import { OmniTransaction } from './types'

export const printTransaction = (transaction: OmniTransaction): string => printRecord(transaction)

export const printTransactions = (transactions: OmniTransaction[]): string =>
    printRecord(transactions.map(printTransaction))
