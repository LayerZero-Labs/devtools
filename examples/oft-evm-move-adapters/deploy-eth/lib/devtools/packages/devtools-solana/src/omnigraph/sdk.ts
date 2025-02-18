import { type Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
    AsyncRetriable,
    formatOmniPoint,
    OmniAddress,
    type OmniPoint,
    type OmniTransaction,
} from '@layerzerolabs/devtools'
import type { IOmniSDK } from './types'
import { type Logger, createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { serializeTransactionMessage } from '@/transactions/serde'
import { createGetAccountInfo, type GetAccountInfo } from '@/common/accounts'

/**
 * Base class for all Solana SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export class OmniSDK implements IOmniSDK {
    protected readonly getAccountInfo: GetAccountInfo

    constructor(
        public readonly connection: Connection,
        public readonly point: OmniPoint,
        public readonly userAccount: PublicKey,
        protected readonly logger: Logger = createModuleLogger(
            `Solana SDK ${new.target.name} @ ${formatOmniPoint(point)}`
        )
    ) {
        this.getAccountInfo = createGetAccountInfo(connection, logger)
    }

    /**
     * Human radable label for this SDK
     */
    get label(): string {
        return `Solana program @ ${formatOmniPoint(this.point)}`
    }

    get publicKey(): PublicKey {
        return new PublicKey(this.point.address)
    }

    @AsyncRetriable()
    protected async createTransaction(transaction: Transaction): Promise<OmniTransaction> {
        const { blockhash } = await this.connection.getLatestBlockhash('finalized')

        // Transactions in Solana require a block hash and a fee payer account in order to be serialized
        transaction.feePayer = this.userAccount
        transaction.recentBlockhash = blockhash

        return {
            point: this.point,
            data: serializeTransactionMessage(transaction),
        }
    }

    @AsyncRetriable()
    protected async isAccountInitialized(account: OmniAddress): Promise<boolean> {
        this.logger.verbose(`Checking whether account ${account} is initialized`)

        const accountInfo = await this.getAccountInfo(account)
        const isAccountInitialized = accountInfo != null

        return (
            this.logger.verbose(
                `Checked whether account ${account} is initialized: ${printBoolean(isAccountInitialized)}`
            ),
            isAccountInitialized
        )
    }
}
