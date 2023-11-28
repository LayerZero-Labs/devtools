import { Contract } from '@ethersproject/contracts'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface OmniContract<TContract extends Contract = Contract> {
    eid: EndpointId
    contract: TContract
}
