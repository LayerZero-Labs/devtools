import { OmniPoint } from '@/omnigraph/types'
import { EndpointBasedFactory } from '@/types'

export interface OmniTransaction {
    point: OmniPoint
    data: string
    description?: string
    gasLimit?: string | bigint | number
    value?: string | bigint | number
}

export interface OmniTransactionWithResponse<TReceipt extends OmniTransactionReceipt = OmniTransactionReceipt> {
    transaction: OmniTransaction
    response: OmniTransactionResponse<TReceipt>
}

export interface OmniTransactionWithReceipt<TReceipt extends OmniTransactionReceipt = OmniTransactionReceipt> {
    transaction: OmniTransaction
    receipt: TReceipt
}

export interface OmniTransactionWithError<TError = unknown> {
    transaction: OmniTransaction
    error: TError
}

export interface OmniTransactionResponse<TReceipt extends OmniTransactionReceipt = OmniTransactionReceipt> {
    transactionHash: string
    wait: (confirmations?: number) => Promise<TReceipt>
}

export interface OmniTransactionReceipt {
    transactionHash: string
}

export interface OmniSigner<TResponse extends OmniTransactionResponse = OmniTransactionResponse> {
    sign: (transaction: OmniTransaction) => Promise<string>
    signAndSend: (transaction: OmniTransaction) => Promise<TResponse>

    /**
     * Signers can support multi send / batch mode
     * where multiple transactions get submitted together.
     *
     * Examples of this are Gnosis Safe signer or a signer using an EVM multicall contract.
     *
     * @param {OmniTransaction[]} transactions
     */
    signAndSendBatch?: (transactions: OmniTransaction[]) => Promise<TResponse>
}

export type OmniSignerFactory<TSigner extends OmniSigner = OmniSigner> = EndpointBasedFactory<TSigner>
