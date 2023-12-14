import { OmniTransaction } from '@layerzerolabs/utils'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IOmniCounter {
    increment(eid: EndpointId, type: number, options: string): Promise<OmniTransaction>
}
