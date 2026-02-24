import type { OmniPoint } from '@layerzerolabs/devtools'
import { ChainType, endpointIdToChainType, type EndpointId } from '@layerzerolabs/lz-definitions'
import { assertStarknetAddress } from '../common'

export const createStarknetPoint = (eid: EndpointId, address: string): OmniPoint => {
    assertStarknetAddress(address)
    return { eid, address }
}

export const isOmniPointOnStarknet = ({ eid }: OmniPoint): boolean => endpointIdToChainType(eid) === ChainType.STARKNET
