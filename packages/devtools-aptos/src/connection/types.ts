import type { Aptos } from '@aptos-labs/ts-sdk'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

/**
 * Factory function that creates Aptos client connections based on endpoint ID
 */
export type ConnectionFactory = (eid: EndpointId) => Promise<Aptos>

/**
 * Factory function that returns RPC URLs based on endpoint ID
 */
export type RpcUrlFactory = (eid: EndpointId) => Promise<string>
