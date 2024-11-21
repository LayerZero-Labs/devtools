import { Logger, createModuleLogger } from '@layerzerolabs/io-devtools'
import type { IOmniSDK , OmniPoint } from '@layerzerolabs/devtools'
import { Aptos, InputEntryFunctionData, generateTransactionPayload, InputEntryFunctionDataWithRemoteABI, Serializer } from '@aptos-labs/ts-sdk'
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

    protected async serializeTransactionData(data: InputEntryFunctionData): Promise<string> {
        // TOOD: remove network call (this.aptos.config)
        const payload = await generateTransactionPayload({
            ...data,
            aptosConfig: this.aptos.config,
        })

        return serializeTransactionPayload(payload)
    }
}
