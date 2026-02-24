import { Transaction } from '@mysten/sui/transactions'
import { type Signer } from '@mysten/sui/cryptography'
import type { SuiClient } from '@mysten/sui/client'
import {
    OmniSigner,
    OmniSignerBase,
    type OmniSignerFactory,
    type OmniTransaction,
    type OmniTransactionReceipt,
    type OmniTransactionResponse,
    OmniPoint,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { ConnectionFactory } from '../connection'
import { createModuleLogger, type Logger } from '@layerzerolabs/io-devtools'

export class OmniSignerSui extends OmniSignerBase implements OmniSigner {
    constructor(
        eid: EndpointId,
        public readonly client: SuiClient,
        public readonly signer: Signer,
        protected readonly logger: Logger = createModuleLogger('OmniSignerSui')
    ) {
        super(eid)
    }

    getPoint(): OmniPoint {
        return { eid: this.eid, address: this.signer.toSuiAddress() }
    }

    async sign(transaction: OmniTransaction): Promise<string> {
        this.assertTransaction(transaction)

        const suiTransaction = Transaction.from(transaction.data)
        suiTransaction.setSender(this.signer.toSuiAddress())
        const bytes = await suiTransaction.build({ client: this.client })
        const signature = await this.signer.signTransaction(bytes)

        return signature.signature
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        this.assertTransaction(transaction)

        const suiTransaction = Transaction.from(transaction.data)
        suiTransaction.setSender(this.signer.toSuiAddress())
        const response = await this.signer.signAndExecuteTransaction({
            transaction: suiTransaction,
            client: this.client,
        })

        const digest = response.digest

        return {
            transactionHash: digest,
            wait: async () => {
                await this.client.waitForTransaction({ digest })
                return { transactionHash: digest }
            },
        }
    }
}

export const createSuiSignerFactory =
    (
        signer: Signer,
        connectionFactory: ConnectionFactory
    ): OmniSignerFactory<OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>> =>
    async (eid: EndpointId) =>
        new OmniSignerSui(eid, await connectionFactory(eid), signer)
