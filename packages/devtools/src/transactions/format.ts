import { OmniTransaction } from './types'
import { formatEid } from '@/omnigraph/format'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import bs58 from 'bs58'

/**
 * Format transaction data for display.
 * Converts hex to base58 for Solana transactions.
 */
const formatTransactionData = (data: string, eid: number): string => {
    const chainType = endpointIdToChainType(eid)

    switch (chainType) {
        case ChainType.SOLANA:
            return hexToBase58(data)
        default:
            return data // default to hex string
    }
}

export const hexToBase58 = (hexString: string): string => {
    // Remove '0x' prefix if present
    const hexData = hexString.startsWith('0x') ? hexString.slice(2) : hexString
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
