import { OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IOmniCounter {
    increment(eid: EndpointId, type: number, options: string): Promise<OmniTransaction>
}
