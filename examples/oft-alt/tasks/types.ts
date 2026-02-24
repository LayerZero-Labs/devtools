export interface SendResult {
    txHash: string // EVM: receipt.transactionHash
    scanLink: string // LayerZeroScan link for cross-chain tracking
    outboundNonce: string // Outbound nonce for tracking
    extraOptions?: string // Hex-encoded options used in the transaction
}
