import { formatOmniTransaction as formatOmniTransactionBase, type OmniTransaction } from '@layerzerolabs/devtools'
import { getNetworkNameForEidMaybe } from '@/runtime'

export const formatOmniTransaction = (
    transaction: OmniTransaction
): Record<string, string | number | bigint | undefined> => ({
    Network: getNetworkNameForEidMaybe(transaction.point.eid) ?? '[Not defined in hardhat config]',
    ...formatOmniTransactionBase(transaction),
})
