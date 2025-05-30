import TronWeb from 'tronweb'
import pMemoize from 'p-memoize'
import { formatEid, type RpcUrlFactory } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { TronWebFactory, PrivateKeyFactory } from './types'

export const defaultRpcUrlFactory: RpcUrlFactory = (eid) => {
    switch (eid) {
        case EndpointId.TRON_MAINNET:
            return 'https://api.trongrid.io'
        case EndpointId.TRON_TESTNET:
            return 'https://api.shasta.trongrid.io'
    }
    throw new Error(`Could not find a default Tron RPC URL for eid ${eid} (${formatEid(eid)})`)
}

export const createRpcUrlFactory =
    (overrides: Partial<Record<EndpointId, string | null>> = {}): RpcUrlFactory =>
    (eid) =>
        overrides[eid] ?? defaultRpcUrlFactory(eid)

export const createTronWebFactory = (
    urlFactory: RpcUrlFactory = defaultRpcUrlFactory,
    privateKeyFactory?: PrivateKeyFactory
): TronWebFactory =>
    pMemoize(async (eid) => {
        const fullHost = await urlFactory(eid)
        const privateKey = privateKeyFactory ? await privateKeyFactory(eid) : undefined
        return new TronWeb({
            fullHost,
            ...(privateKey ? { privateKey } : {}),
        })
    })
