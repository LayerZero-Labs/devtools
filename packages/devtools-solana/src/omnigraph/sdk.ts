import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { formatOmniPoint, type OmniPoint, type OmniTransaction } from '@layerzerolabs/devtools'
import type { IOmniSDK } from './types'
import { Logger, createModuleLogger } from '@layerzerolabs/io-devtools'
import { serializeTransactionMessage } from '@/transactions/serde'

/**
 * Base class for all Solana SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    constructor(
        public readonly connection: Connection,
        public readonly point: OmniPoint,
        public readonly account: PublicKey,
        protected readonly logger: Logger = createModuleLogger(
            `Solana SDK ${new.target.name} @ ${formatOmniPoint(point)}`
        )
    ) {}

    /**
     * Human radable label for this SDK
     */
    get label(): string {
        return `Solana program @ ${formatOmniPoint(this.point)}`
    }

    protected async createTransaction(transaction: Transaction): Promise<OmniTransaction> {
        const { blockhash } = await this.connection.getLatestBlockhash('finalized')

        // Transactions in Solana require a block hash and a fee payer account in order to be serialized
        transaction.feePayer = this.account
        transaction.recentBlockhash = blockhash

        return {
            point: this.point,
            data: serializeTransactionMessage(transaction),
        }
    }
}
