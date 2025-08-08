export interface SendResult {
    txHash: string // EVM: receipt.transactionHash
    scanLink: string // LayerZeroScan link for cross-chain tracking
    outboundNonce: string // Outbound nonce for SimpleDVN processing (converted from Number)
}
