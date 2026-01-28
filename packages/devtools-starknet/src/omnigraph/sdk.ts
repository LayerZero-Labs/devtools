import type { Call, RpcProvider } from 'starknet'
import { formatOmniPoint, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { createModuleLogger, type Logger } from '@layerzerolabs/io-devtools'
import type { IOmniSDK } from './types'
import { serializeStarknetCalls } from '../transactions'

export class OmniSDK implements IOmniSDK {
    constructor(
        public readonly provider: RpcProvider,
        public readonly point: OmniPoint,
        protected readonly logger: Logger = createModuleLogger(`Starknet SDK @ ${formatOmniPoint(point)}`)
    ) {}

    get label(): string {
        return `Starknet contract @ ${formatOmniPoint(this.point)}`
    }

    protected createTransaction(calls: Call[]): OmniTransaction {
        return {
            point: this.point,
            data: serializeStarknetCalls(calls),
        }
    }
}
