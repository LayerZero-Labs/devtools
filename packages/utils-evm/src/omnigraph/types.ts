import type { Contract } from '@ethersproject/contracts'
import type { IOmniSDK as IOmniSDKAbstract, OmniPoint, WithEid } from '@layerzerolabs/utils'

export type OmniContract<TContract extends Contract = Contract> = WithEid<{
    contract: TContract
}>

export type OmniContractFactory = (point: OmniPoint) => OmniContract | Promise<OmniContract>

/**
 * Base interface for all EVM SDKs, adding the EVM specific attributes
 */
export interface IOmniSDK extends IOmniSDKAbstract {
    contract: OmniContract
}
