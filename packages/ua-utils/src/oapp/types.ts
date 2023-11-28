import type { Address, OmniTransaction } from '@/omnigraph/types'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IOApp {
    peers(eid: EndpointId): Promise<string | undefined>
    setPeer(eid: EndpointId, peer: Address): Promise<OmniTransaction>
}
