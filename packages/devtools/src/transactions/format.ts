import { OmniTransaction } from './types'
import { formatEid } from '@/omnigraph/format'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import bs58 from 'bs58'

/**
 * Helper to check if an endpoint ID is for Solana
 */
const isSolanaEid = (eid: number): boolean => endpointIdToChainType(eid) === ChainType.SOLANA

/**
 * Format transaction data for display.
 * Converts hex to base58 for Solana transactions.
 */
const formatTransactionData = (data: string, eid: number): string => {
    if (!isSolanaEid(eid)) {
        return data
    }

    // Convert hex string to base58 for Solana
    // Remove '0x' prefix if present
    const hexData = data.startsWith('0x') ? data.slice(2) : data
    const bytes = Uint8Array.from(Buffer.from(hexData, 'hex'))
    return bs58.encode(bytes)
}

export const formatOmniTransaction = (
    transaction: OmniTransaction
): Record<string, string | number | bigint | undefined> => ({
    Endpoint: formatEid(transaction.point.eid),
    OmniAddress: transaction.point.address,
    OmniContract: transaction.metadata?.contractName,
    'Function Name': transaction.metadata?.functionName,
    'Function Arguments': transaction.metadata?.functionArgs,
    Description: transaction.description,
    Data: formatTransactionData(transaction.data, transaction.point.eid),
    Value: transaction.value,
    'Gas Limit': transaction.gasLimit,
})
