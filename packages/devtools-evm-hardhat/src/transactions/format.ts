import { formatOmniTransaction as formatOmniTransactionBase, type OmniTransaction } from '@layerzerolabs/devtools'
import { getNetworkNameForEid } from '@/runtime'

export const formatOmniTransaction = (
    transaction: OmniTransaction
): Record<string, string | number | bigint | undefined> => ({
    Network: getNetworkNameForEid(transaction.point.eid),
    ...formatOmniTransactionBase(transaction),
})
