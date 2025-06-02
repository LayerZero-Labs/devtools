export interface SendResult {
    txHash: string // EVM: receipt.transactionHash, Solana: base58 sig
    scanLink: string // LayerZeroScan link for cross-chain tracking
}
