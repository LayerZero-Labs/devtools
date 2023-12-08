import type { Contract } from '@ethersproject/contracts'
import type { OmniPoint, WithEid } from '@layerzerolabs/utils'

export type OmniContract<TContract extends Contract = Contract> = WithEid<{
    contract: TContract
}>

export type OmniContractFactory = (point: OmniPoint) => OmniContract | Promise<OmniContract>
