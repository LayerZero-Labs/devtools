import pMemoize from 'p-memoize'
import { type RpcUrlFactory } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { SuiClient } from '@mysten/sui/client'
import type { ConnectionFactory } from './types'

export const defaultRpcUrlFactory: RpcUrlFactory = (eid) => {
    throw new Error(`No default Sui RPC URL configured for eid ${eid}. Provide an override via createRpcUrlFactory().`)
}

export const createRpcUrlFactory =
    (overrides: Partial<Record<EndpointId, string | null>> = {}): RpcUrlFactory =>
    (eid) =>
        overrides[eid] ?? process.env.RPC_URL_SUI ?? process.env.RPC_URL_SUI_TESTNET ?? defaultRpcUrlFactory(eid)

export const createConnectionFactory = (urlFactory: RpcUrlFactory = defaultRpcUrlFactory): ConnectionFactory =>
    pMemoize(async (eid) => new SuiClient({ url: await urlFactory(eid) }))
