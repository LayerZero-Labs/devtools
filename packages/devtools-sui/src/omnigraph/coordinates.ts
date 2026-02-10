import type { OmniPoint } from '@layerzerolabs/devtools'
import { ChainType, endpointIdToChainType, type EndpointId } from '@layerzerolabs/lz-definitions'
import { assertSuiAddress } from '../common'

export const createSuiPoint = (eid: EndpointId, address: string): OmniPoint => {
    assertSuiAddress(address)
    return { eid, address }
}

export const isOmniPointOnSui = ({ eid }: OmniPoint): boolean => endpointIdToChainType(eid) === ChainType.SUI
