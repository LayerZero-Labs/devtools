import { Connection } from '@solana/web3.js'
import { formatOmniPoint, type OmniPoint, type OmniTransaction } from '@layerzerolabs/devtools'
import type { IOmniSDK } from './types'
import { Logger, createModuleLogger } from '@layerzerolabs/io-devtools'

/**
 * Base class for all Solana SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    constructor(
        public readonly connection: Connection,
        public readonly point: OmniPoint,
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

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: this.point,
            data,
        }
    }
}
