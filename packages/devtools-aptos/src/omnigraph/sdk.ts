import { Logger, createModuleLogger } from '@layerzerolabs/io-devtools'
import type { IOmniSDK, OmniPoint } from '@layerzerolabs/devtools'
import { Aptos, InputEntryFunctionData } from '@aptos-labs/ts-sdk'
import { formatOmniPoint } from '@layerzerolabs/devtools'
import { serializeTransactionPayload } from '../signer/serde'

/**
 * Base class for all EVM SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    constructor(
        public readonly aptos: Aptos,
        public readonly point: OmniPoint,
        protected readonly logger: Logger = createModuleLogger(
            `Aptos SDK ${new.target.name} @ ${formatOmniPoint(point)}`
        )
    ) {}

    /**
     * Human radable label for this SDK
     */
    get label(): string {
        return formatOmniPoint(this.point)
    }

    protected async serializeTransactionData(sender: string, data: InputEntryFunctionData): Promise<string> {
        const simpleTransaction = await this.aptos.transaction.build.simple({
            sender,
            data,
        })
        return serializeTransactionPayload(simpleTransaction)
    }
}
