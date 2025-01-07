import { TonClient } from '@ton/ton'
import pMemoize from 'p-memoize'

import { EndpointBasedFactory, formatEid, OmniPoint, type RpcUrlFactory } from '@layerzerolabs/devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

import { TonClientFactory } from './types'

export const isOmniPointOnTon = ({ eid }: OmniPoint): boolean => endpointIdToChainType(eid) === ChainType.TON

export const defaultRpcUrlFactory: RpcUrlFactory = (eid) => {
    switch (eid) {
        case EndpointId.TON_V2_MAINNET:
            return 'https://toncenter.com/api/v2/'
        case EndpointId.TON_V2_TESTNET:
            return 'https://testnet.toncenter.com/api/v2/'
    }

    throw new Error(`Could not find a default TON RPC URL for eid ${eid} (${formatEid(eid)})`)
}

/**
 * Creates a TON RPC URL factory with the ability to specify overrides
 * for specific `EndpointId`s.
 *
 * This is a convenience method for when custom RPC URLs can be provided, e.g.
 * from environment variables.
 *
 * ```
 * const rpcUrlFactory = createRpcUrlFactory({ [EndpointId.TON_V2_MAINNET]: process.env.NETWORK_URL_TON_MAINNET })
 * ```
 *
 * @param {Partial<Record<EndpointId, string | null>>} [overrides] An object mapping `EndpointId`s to RPC URLs.
 * @returns {RpcUrlFactory}
 */
export const createRpcUrlFactory =
    (overrides: Partial<Record<EndpointId, string | null>> = {}): RpcUrlFactory =>
    (eid) =>
        overrides[eid] ?? defaultRpcUrlFactory(eid)

export const createTonClientFactory = (
    urlFactory: RpcUrlFactory = defaultRpcUrlFactory,
    apiKeyFactory?: EndpointBasedFactory<string>
): TonClientFactory =>
    pMemoize(
        async (eid) =>
            new TonClient({
                endpoint: await urlFactory(eid),
                ...(apiKeyFactory ? { apiKey: await apiKeyFactory(eid) } : {}),
            })
    )
