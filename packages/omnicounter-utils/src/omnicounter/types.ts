import { OmniTransaction } from '@layerzerolabs/utils'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IOmniCounterApp {
    increment(eid: EndpointId, type: number, options: string): Promise<OmniTransaction>
}
