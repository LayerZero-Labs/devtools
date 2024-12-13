import { formatOmniPoint, type OmniPoint, type OmniTransaction, IOmniSDK } from '@layerzerolabs/devtools'
import { Logger, createModuleLogger } from '@layerzerolabs/io-devtools'
import { TonClient } from '@ton/ton'

/**
 * Base class for all TON SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    constructor(
        public readonly tonClient: TonClient,
        public readonly point: OmniPoint,
        protected readonly logger: Logger = createModuleLogger(`TON SDK ${new.target.name} @ ${formatOmniPoint(point)}`)
    ) {}

    /**
     * Human readable label for this SDK
     */
    get label(): string {
        return formatOmniPoint(this.point)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: this.point,
            data,
        }
    }
}
