import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { Address, OmniTransaction } from '@layerzerolabs/utils'

export interface IOApp {
    peers(eid: EndpointId): Promise<string | undefined>
    setPeer(eid: EndpointId, peer: Address): Promise<OmniTransaction>
}
