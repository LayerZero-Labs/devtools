import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { formatOmniPoint, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { createModuleLogger, type Logger } from '@layerzerolabs/io-devtools'
import type { IOmniSDK } from './types'

export class OmniSDK implements IOmniSDK {
    constructor(
        public readonly client: SuiClient,
        public readonly point: OmniPoint,
        protected readonly logger: Logger = createModuleLogger(`Sui SDK @ ${formatOmniPoint(point)}`)
    ) {}

    get label(): string {
        return `Sui package @ ${formatOmniPoint(this.point)}`
    }

    protected async createTransaction(transaction: Transaction): Promise<OmniTransaction> {
        // Serialize the transaction using its JSON representation
        // This preserves all transaction data without requiring a sender at build time
        // The sender will be set during signing
        const serialized = transaction.serialize()

        return {
            point: this.point,
            data: serialized,
        }
    }
}
