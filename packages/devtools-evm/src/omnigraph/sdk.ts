import { OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { IOmniSDK, OmniContract } from './types'
import { omniContractToPoint } from './coordinates'
import { createContractErrorParser } from '@/errors/parser'
import { OmniContractErrorParser } from '@/errors/types'
import { ContractError } from '..'

/**
 * Base class for all EVM SDKs, providing some common functionality
 * to reduce the boilerplate
 */
export abstract class OmniSDK implements IOmniSDK {
    constructor(
        public readonly contract: OmniContract,
        protected readonly errorParser: OmniContractErrorParser = createContractErrorParser(contract)
    ) {}

    get point(): OmniPoint {
        return omniContractToPoint(this.contract)
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: this.point,
            data,
        }
    }

    protected parseError(error: unknown): ContractError {
        return this.errorParser(error)
    }
}
