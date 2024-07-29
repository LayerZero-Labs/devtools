import {
    type OmniSigner,
    type OmniTransaction,
    type OmniTransactionReceipt,
    type OmniTransactionResponse,
    OmniPoint,
    OmniSignerBase,
} from '@layerzerolabs/devtools'
import { ConfirmOptions, Connection, sendAndConfirmTransaction, Signer } from '@solana/web3.js'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deserializeTransactionMessage, serializeTransactionBuffer } from './serde'

export class OmniSignerSolana extends OmniSignerBase implements OmniSigner {
    constructor(
        eid: EndpointId,
        public readonly connection: Connection,
        public readonly signer: Signer,
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

        const signature = await sendAndConfirmTransaction(
            this.connection,
            solanaTransaction,
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
