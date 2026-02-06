import pMemoize from 'p-memoize'
import { type RpcUrlFactory } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { RpcProvider } from 'starknet'
import type { ConnectionFactory } from './types'

export const defaultRpcUrlFactory: RpcUrlFactory = (eid) => {
    throw new Error(
        `No default Starknet RPC URL configured for eid ${eid}. Provide an override via createRpcUrlFactory().`
    )
}

export const createRpcUrlFactory =
    (overrides: Partial<Record<EndpointId, string | null>> = {}): RpcUrlFactory =>
    (eid) =>
        overrides[eid] ??
        process.env.RPC_URL_STARKNET ??
        process.env.RPC_URL_STARKNET_TESTNET ??
        defaultRpcUrlFactory(eid)

export const createConnectionFactory = (urlFactory: RpcUrlFactory = defaultRpcUrlFactory): ConnectionFactory =>
    pMemoize(async (eid) => new RpcProvider({ nodeUrl: await urlFactory(eid) }))
