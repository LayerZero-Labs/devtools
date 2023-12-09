import type { TransactionReceipt, TransactionRequest } from '@ethersproject/abstract-provider'
import type { Signer } from '@ethersproject/abstract-signer'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    formatEid,
    formatOmniPoint,
    type OmniTransactionResponse,
    type OmniSigner,
    type OmniTransaction,
} from '@layerzerolabs/utils'
import assert from 'assert'

/**
 * Implements an OmniSigner interface for EVM-compatible chains
 */
export class OmniSignerEVM implements OmniSigner {
    constructor(
        public readonly eid: EndpointId,
        public readonly signer: Signer
    ) {}

    async sign(transaction: OmniTransaction): Promise<string> {
        this.#assertTransaction(transaction)

        return this.signer.signTransaction(this.#serializeTransaction(transaction))
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<TransactionReceipt>> {
        this.#assertTransaction(transaction)

        const nativeTransaction = this.#serializeTransaction(transaction)
        const { hash, ...response } = await this.signer.sendTransaction(nativeTransaction)

        return {
            ...response,
            transactionHash: hash,
        }
    }

    #assertTransaction(transaction: OmniTransaction) {
        assert(
            transaction.point.eid === this.eid,
            `Could not use signer for ${formatEid(this.eid)} to sign a transaction for ${formatOmniPoint(
                transaction.point
            )}`
        )
    }

    #serializeTransaction(transaction: OmniTransaction): TransactionRequest {
        // Still missing
        //

        // from?: string,
        // nonce?: BigNumberish,

        // gasPrice?: BigNumberish,

        // data?: BytesLike,
        // chainId?: number

        // type?: number;
        // accessList?: AccessListish;

        // maxPriorityFeePerGas?: BigNumberish;
        // maxFeePerGas?: BigNumberish;

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
