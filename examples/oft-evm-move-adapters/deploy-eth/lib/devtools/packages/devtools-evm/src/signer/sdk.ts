import type { TransactionReceipt, TransactionRequest } from '@ethersproject/abstract-provider'
import type { Signer } from '@ethersproject/abstract-signer'
import Safe, { ConnectSafeConfig, EthersAdapter } from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'
import { MetaTransactionData, OperationType, SafeTransaction } from '@safe-global/safe-core-sdk-types'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    OmniSignerBase,
    type OmniTransactionResponse,
    type OmniSigner,
    type OmniTransaction,
    type OmniPoint,
} from '@layerzerolabs/devtools'
import assert from 'assert'

import { ethers } from 'ethers'

export abstract class OmniSignerEVMBase extends OmniSignerBase implements OmniSigner {
    protected constructor(
        eid: EndpointId,
        public readonly signer: Signer
    ) {
        super(eid)
    }

    async getPoint(): Promise<OmniPoint> {
        return { eid: this.eid, address: await this.signer.getAddress() }
    }
}

/**
 * Implements an OmniSigner interface for EVM-compatible chains
 */
export class OmniSignerEVM extends OmniSignerEVMBase {
    constructor(eid: EndpointId, signer: Signer) {
        super(eid, signer)
    }

    async sign(transaction: OmniTransaction): Promise<string> {
        this.assertTransaction(transaction)

        return this.signer.signTransaction(this.#serializeTransaction(transaction))
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<TransactionReceipt>> {
        this.assertTransaction(transaction)

        const nativeTransaction = this.#serializeTransaction(transaction)
        const { hash, ...response } = await this.signer.sendTransaction(nativeTransaction)

        return {
            ...response,
            transactionHash: hash,
        }
    }

    #serializeTransaction(transaction: OmniTransaction): TransactionRequest {
        return {
            // mandatory
            to: transaction.point.address,
            data: transaction.data,

            // optional
            ...(transaction.gasLimit != null && { gasLimit: transaction.gasLimit }),
            ...(transaction.value != null && { value: transaction.value }),
        }
    }
}

/**
 * Implements an OmniSigner interface for EVM-compatible chains using Gnosis Safe.
 */
export class GnosisOmniSignerEVM<TSafeConfig extends ConnectSafeConfig> extends OmniSignerEVMBase {
    constructor(
        eid: EndpointId,
        signer: Signer,
        protected readonly safeUrl: string,
        protected readonly safeConfig: TSafeConfig,
        protected readonly ethAdapter = new EthersAdapter({
            ethers,
            signerOrProvider: signer,
        }),
        protected readonly apiKit = new SafeApiKit({ txServiceUrl: safeUrl, ethAdapter }),
        protected readonly safeSdkPromise: Safe | Promise<Safe> = Safe.create({
            ethAdapter,
            safeAddress: safeConfig.safeAddress!,
            contractNetworks: safeConfig.contractNetworks,
        })
    ) {
        super(eid, signer)
    }

    async sign(_: OmniTransaction): Promise<string> {
        throw new Error(`Signing transactions with safe is currently not supported, use signAndSend instead`)
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse> {
        return this.signAndSendBatch([transaction])
    }

    async signAndSendBatch(transactions: OmniTransaction[]): Promise<OmniTransactionResponse> {
        assert(transactions.length > 0, `signAndSendBatch received 0 transactions`)

        const safeTransaction = await this.#createSafeTransaction(transactions)

        return this.#proposeSafeTransaction(safeTransaction)
    }

    async #proposeSafeTransaction(safeTransaction: SafeTransaction): Promise<OmniTransactionResponse> {
        const safeSdk = await this.safeSdkPromise
        const safeAddress = await safeSdk.getAddress()
        const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
        const senderSignature = await safeSdk.signTransactionHash(safeTxHash)
        const senderAddress = await this.signer.getAddress()

        await this.apiKit.proposeTransaction({
            senderSignature: senderSignature.data,
            safeAddress,
            safeTransactionData: safeTransaction.data,
            safeTxHash,
            senderAddress,
        })

        return {
            transactionHash: safeTxHash,
            wait: async (_confirmations?: number) => {
                return {
                    transactionHash: safeTxHash,
                }
            },
        }
    }

    async #createSafeTransaction(transactions: OmniTransaction[]): Promise<SafeTransaction> {
        transactions.forEach((transaction) => this.assertTransaction(transaction))

        const safeSdk = await this.safeSdkPromise
        const safeAddress = await safeSdk.getAddress()
        const nonce = await this.apiKit.getNextNonce(safeAddress)

        return safeSdk.createTransaction({
            safeTransactionData: transactions.map((transaction) => this.#serializeTransaction(transaction)),
            options: { nonce },
        })
    }

    #serializeTransaction(transaction: OmniTransaction): MetaTransactionData {
        return {
            to: transaction.point.address,
            data: transaction.data,
            value: String(transaction.value ?? 0),
            operation: OperationType.Call,
        }
    }
}
