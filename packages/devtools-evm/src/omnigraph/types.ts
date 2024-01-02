import type { Contract } from '@ethersproject/contracts'
import type { Factory, IOmniSDK as IOmniSDKAbstract, OmniPoint, WithEid } from '@layerzerolabs/devtools'

export type OmniContract<TContract extends Contract = Contract> = WithEid<{
    contract: TContract
}>

export type OmniContractFactory<TOmniPoint = OmniPoint> = Factory<[TOmniPoint], OmniContract>

/**
 * Base interface for all EVM SDKs, adding the EVM specific attributes
 */
export interface IOmniSDK extends IOmniSDKAbstract {
    contract: OmniContract
}
