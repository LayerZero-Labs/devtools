import { TonClient, TonClient3 } from '@ton/ton'
import pMemoize from 'p-memoize'

import { formatEid, OmniPoint, type RpcUrlFactory } from '@layerzerolabs/devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

import { TonApiFactory, TonClientFactory } from './types'
import { TonClient3Factory } from './types'

export const isOmniPointOnTon = ({ eid }: OmniPoint): boolean => endpointIdToChainType(eid) === ChainType.TON

const V2_SUBPATH = '/api/v2/jsonRPC'
const V3_SUBPATH = '/api/v3'

const baseUrlByEid = {
    [EndpointId.TON_V2_MAINNET]: 'https://toncenter.com',
    [EndpointId.TON_V2_TESTNET]: 'https://testnet.toncenter.com',
}

const getRpcUrl = (eid, clientVersion: 'v2' | 'v3') => {
    const baseUrl = baseUrlByEid[eid]
    if (!baseUrl) {
        throw new Error(`Could not find a default TON RPC URL for eid ${eid} (${formatEid(eid)})`)
    }
    return `${baseUrlByEid[eid]}${clientVersion === 'v2' ? V2_SUBPATH : V3_SUBPATH}`
}

export const defaultRpcUrlFactory: RpcUrlFactory = (eid) => {
    return getRpcUrl(eid, 'v2')
}

export const defaultRpcUrl3Factory: RpcUrlFactory = (eid) => {
    return getRpcUrl(eid, 'v3')
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
    apiKeyFactory?: TonApiFactory
): TonClientFactory =>
    pMemoize(
        async (eid) =>
            new TonClient({
                endpoint: await urlFactory(eid),
                ...(apiKeyFactory ? { apiKey: await apiKeyFactory(eid) } : {}),
            })
    )

export const createTonClient3Factory = (
    urlFactory: RpcUrlFactory = defaultRpcUrl3Factory,
    apiKeyFactory?: TonApiFactory
): TonClient3Factory =>
    pMemoize(
        async (eid) =>
            new TonClient3({
                endpoint: await urlFactory(eid),
                ...(apiKeyFactory ? { apiKey: await apiKeyFactory(eid) } : {}),
            })
    )
