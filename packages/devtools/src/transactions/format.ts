import { OmniTransaction, OmniTransactionMetadata } from './types'
import { formatEid } from '@/omnigraph/format'

export const formatOmniTransaction = (
    transaction: OmniTransaction
): Record<string, string | number | bigint | undefined | null | OmniTransactionMetadata> => ({
    Endpoint: formatEid(transaction.point.eid),
    OmniAddress: transaction.point.address,
    OmniContract: transaction.point.contractName,
    'Function Name': transaction.metadata?.functionName,
    'Function Arguments': transaction.metadata?.functionArgs,
    Description: transaction.description,
    Data: transaction.data,
    Value: transaction.value,
    'Gas Limit': transaction.gasLimit,
})
