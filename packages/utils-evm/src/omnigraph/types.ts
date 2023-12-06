import type { Contract } from '@ethersproject/contracts'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/utils'

export interface OmniContract<TContract extends Contract = Contract> {
    eid: EndpointId
    contract: TContract
}

export type OmniContractFactory = (point: OmniPoint) => OmniContract | Promise<OmniContract>
