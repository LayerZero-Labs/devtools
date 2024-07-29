import {
    type OmniSigner,
    type OmniTransaction,
    type OmniTransactionReceipt,
    type OmniTransactionResponse,
    OmniPoint,
    OmniSignerBase,
} from '@layerzerolabs/devtools'
import {
    ConfirmOptions,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
    Transaction,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deserializeTransactionMessage, serializeTransactionBuffer } from './serde'

export class OmniSignerSolana extends OmniSignerBase implements OmniSigner {
    constructor(
        eid: EndpointId,
        public readonly connection: Connection,
        public readonly signer: Signer,
        public readonly lookupAddress?: PublicKey,
        public readonly confirmOptions: ConfirmOptions = { commitment: 'finalized' }
    ) {
        super(eid)
    }

    getPoint(): OmniPoint {
        return { eid: this.eid, address: this.signer.publicKey.toBase58() }
    }

    async sign(transaction: OmniTransaction): Promise<string> {
        this.assertTransaction(transaction)

        const solanaTransaction = deserializeTransactionMessage(transaction.data)

        solanaTransaction.sign(this.signer)

        return serializeTransactionBuffer(solanaTransaction.serialize())
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        this.assertTransaction(transaction)

        const solanaTransaction = deserializeTransactionMessage(transaction.data)

        if (this.lookupAddress == null) {
            return await this.signAndSendDefault(solanaTransaction)
        }

        return this.signAndSendVersioned(solanaTransaction, this.lookupAddress)
    }

    protected async signAndSendVersioned(
        transaction: Transaction,
        lookupAddress: PublicKey
    ): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        const { value: lookupTable } = await this.connection.getAddressLookupTable(lookupAddress)
        if (lookupTable == null) {
            return this.signAndSendDefault(transaction)
        }

        const versionedTransaction = new VersionedTransaction(
            new TransactionMessage({
                instructions: transaction.instructions,
                payerKey: transaction.feePayer!,
                recentBlockhash: transaction.recentBlockhash!,
            }).compileToV0Message([lookupTable])
        )

        const signature = await this.connection.sendTransaction(versionedTransaction)

        return {
            transactionHash: signature,
            wait: async () => {
                await this.connection.confirmTransaction(signature, 'finalized')

                return { transactionHash: signature }
            },
        }
    }

    protected async signAndSendDefault(
        transaction: Transaction
    ): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        const signature = await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.signer],
            this.confirmOptions
        )

        return {
            transactionHash: signature,
            wait: async () => ({
                transactionHash: signature,
            }),
        }
    }
}
