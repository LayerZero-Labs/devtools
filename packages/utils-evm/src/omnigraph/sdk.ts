import { OmniPoint, OmniTransaction } from '@layerzerolabs/utils'
import { IOmniSDK, OmniContract } from './types'
import { omniContractToPoint } from './coordinates'

/**
 * Base class for all EVM SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    constructor(public readonly contract: OmniContract) {}

    get point(): OmniPoint {
        return omniContractToPoint(this.contract)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: this.point,
            data,
        }
    }
}
