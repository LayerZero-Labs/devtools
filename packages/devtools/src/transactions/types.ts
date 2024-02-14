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
    receipt: TReceipt | null
}

export interface OmniTransactionWithError<TError = unknown> {
    transaction: OmniTransaction
    error: TError
}

export interface OmniTransactionResponse<TReceipt extends OmniTransactionReceipt = OmniTransactionReceipt> {
    hash: string
    wait: (confirmations?: number) => Promise<TReceipt | null>
}

export interface OmniTransactionReceipt {
    hash: string
}

export interface OmniSigner<TResponse extends OmniTransactionResponse = OmniTransactionResponse> {
    sign: (transaction: OmniTransaction) => Promise<string>
    signAndSend: (transaction: OmniTransaction) => Promise<TResponse>
}

export type OmniSignerFactory<TSigner extends OmniSigner = OmniSigner> = EndpointBasedFactory<TSigner>
