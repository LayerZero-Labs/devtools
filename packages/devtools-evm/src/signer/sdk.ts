import type { TransactionReceipt, TransactionRequest } from '@ethersproject/abstract-provider'
import type { Signer } from '@ethersproject/abstract-signer'
import Safe, { ConnectSafeConfig, EthersAdapter } from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'
import { MetaTransactionData, OperationType } from '@safe-global/safe-core-sdk-types'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    formatEid,
    formatOmniPoint,
    type OmniTransactionResponse,
    type OmniSigner,
    type OmniTransaction,
} from '@layerzerolabs/devtools'
import assert from 'assert'

import { ethers } from 'ethers'

export abstract class OmniSignerEVMBase implements OmniSigner {
    protected constructor(
        public readonly eid: EndpointId,
        public readonly signer: Signer
    ) {}

    protected assertTransaction(transaction: OmniTransaction) {
        assert(
            transaction.point.eid === this.eid,
            `Could not use signer for ${formatEid(this.eid)} to sign a transaction for ${formatOmniPoint(
                transaction.point
            )}`
        )
    }

    abstract sign(transaction: OmniTransaction): Promise<string>
    abstract signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse>
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
            ...(transaction.gasLimit && { gasLimit: transaction.gasLimit }),
            ...(transaction.value && { value: transaction.value }),
        }
    }
}

/**
 * Implements an OmniSigner interface for EVM-compatible chains using Gnosis Safe.
 */
export class GnosisOmniSignerEVM<TSafeConfig extends ConnectSafeConfig> extends OmniSignerEVMBase {
    protected safeSdk: Safe | undefined
    protected apiKit: SafeApiKit | undefined

    constructor(
        eid: EndpointId,
        signer: Signer,
        protected readonly safeUrl: string,
        protected readonly safeConfig: TSafeConfig
    ) {
        super(eid, signer)
    }

    async sign(_transaction: OmniTransaction): Promise<string> {
        throw new Error('Method not implemented.')
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse> {
        this.assertTransaction(transaction)
        const { safeSdk, apiKit } = await this.#initSafe()
        const safeTransaction = await safeSdk.createTransaction({
            safeTransactionData: [this.#serializeTransaction(transaction)],
        })
        const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
        const senderSignature = await safeSdk.signTransactionHash(safeTxHash)
        const safeAddress = await safeSdk.getAddress()
        const senderAddress = await this.signer.getAddress()
        await apiKit.proposeTransaction({
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

    #serializeTransaction(transaction: OmniTransaction): MetaTransactionData {
        return {
            to: transaction.point.address,
            data: transaction.data,
            value: '0',
            operation: OperationType.Call,
        }
    }

    async #initSafe() {
        if (this.safeConfig && (!this.safeSdk || !this.apiKit)) {
            const ethAdapter = new EthersAdapter({
                ethers,
                signerOrProvider: this.signer,
            })
            this.apiKit = new SafeApiKit({ txServiceUrl: this.safeUrl, ethAdapter })

            const contractNetworks = this.safeConfig.contractNetworks
            this.safeSdk = await Safe.create({
                ethAdapter,
                safeAddress: this.safeConfig.safeAddress!,
                ...(!!contractNetworks && { contractNetworks }),
            })
        }
        if (!this.safeSdk || !this.apiKit) {
            throw new Error('Safe SDK not initialized')
        }
        return { safeSdk: this.safeSdk, apiKit: this.apiKit }
    }
}
