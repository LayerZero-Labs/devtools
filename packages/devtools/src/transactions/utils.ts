import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniTransaction } from './types'
import { SignAndSendResult } from './signerTypes'

const isNonNullable = <T>(value: T | null | undefined): value is T => value != null

export const flattenTransactions = (
    transations: (OmniTransaction | OmniTransaction[] | null | undefined)[]
): OmniTransaction[] => transations.filter(isNonNullable).flat()

/**
 * Groups transactions by their `eid`, preserving the order per group
 *
 * @param {OmniTransaction[]} transactions
 * @returns {Map<EndpointId, OmniTransaction[]>}
 */
export const groupTransactionsByEid = (transactions: OmniTransaction[]): Map<EndpointId, OmniTransaction[]> =>
    transactions.reduce(
        (transactionsByEid, transaction) =>
            transactionsByEid.set(transaction.point.eid, [
                ...(transactionsByEid.get(transaction.point.eid) ?? []),
                transaction,
            ]),
        new Map<EndpointId, OmniTransaction[]>()
    )

export const isFailedSignAndSendResult = ([, failed]: SignAndSendResult): boolean => failed.length > 0
