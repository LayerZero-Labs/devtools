import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { EndpointId, getNetworkForChainId, Stage } from '@layerzerolabs/lz-definitions'

import type { ConnectionFactory, RpcUrlFactory } from './types'

/**
 * Default RPC URLs for Aptos networks
 */
const DEFAULT_RPC_URLS: Partial<Record<EndpointId, string>> = {
    [EndpointId.APTOS_V2_MAINNET]: 'https://fullnode.mainnet.aptoslabs.com/v1',
    [EndpointId.APTOS_V2_TESTNET]: 'https://fullnode.testnet.aptoslabs.com/v1',
}

/**
 * Creates a factory that returns RPC URLs based on endpoint ID
 *
 * The factory will first check for environment variables in the format:
 * - RPC_URL_APTOS (for mainnet)
 * - RPC_URL_APTOS_TESTNET (for testnet)
 *
 * If no environment variable is set, it falls back to the default public RPC URLs
 */
export const createRpcUrlFactory = (): RpcUrlFactory => {
    return async (eid: EndpointId): Promise<string> => {
        const network = getNetworkForChainId(eid)

        // Check for environment variable
        const envVarSuffix = network.env === Stage.MAINNET ? '' : `_${network.env.toUpperCase()}`
        const envVar = `RPC_URL_APTOS${envVarSuffix}`
        const envUrl = process.env[envVar]

        if (envUrl) {
            return envUrl
        }

        // Fall back to default
        const defaultUrl = DEFAULT_RPC_URLS[eid]
        if (defaultUrl) {
            return defaultUrl
        }

        throw new Error(`No RPC URL configured for Aptos endpoint ${eid}. Set ${envVar} environment variable.`)
    }
}

/**
 * Creates a factory that returns Aptos client connections based on endpoint ID
 *
 * @param urlFactory - Optional factory for RPC URLs. Defaults to createRpcUrlFactory()
 * @returns ConnectionFactory for Aptos clients
 */
export const createConnectionFactory = (urlFactory: RpcUrlFactory = createRpcUrlFactory()): ConnectionFactory => {
    // Cache connections by endpoint ID to avoid creating multiple clients
    const connections = new Map<EndpointId, Aptos>()

    return async (eid: EndpointId): Promise<Aptos> => {
        // Return cached connection if available
        const cached = connections.get(eid)
        if (cached) {
            return cached
        }

        // Get the RPC URL
        const url = await urlFactory(eid)

        // Create the Aptos config and client
        const config = new AptosConfig({
            fullnode: url,
            // Use custom network since we're providing a custom URL
            network: Network.CUSTOM,
        })

        const aptos = new Aptos(config)

        // Cache the connection
        connections.set(eid, aptos)

        return aptos
    }
}
