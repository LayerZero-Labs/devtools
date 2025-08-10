export interface SendResult {
    txHash: string // EVM: receipt.transactionHash
    scanLink: string // LayerZeroScan link for cross-chain tracking
    outboundNonce: string // Outbound nonce for SimpleDVN processing (converted from Number)
    extraOptions?: string // Hex-encoded options used in the transaction. Only used in --simple-workers mode.
}
