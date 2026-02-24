import type { RpcProvider } from 'starknet'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type ConnectionFactory = (eid: EndpointId) => Promise<RpcProvider>
