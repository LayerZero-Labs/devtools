import type { SuiClient } from '@mysten/sui/client'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type ConnectionFactory = (eid: EndpointId) => Promise<SuiClient>
