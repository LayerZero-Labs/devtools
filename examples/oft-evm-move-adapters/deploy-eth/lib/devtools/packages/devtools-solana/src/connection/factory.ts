import pMemoize from 'p-memoize'
import { formatEid, type RpcUrlFactory } from '@layerzerolabs/devtools'
import { ConnectionFactory } from './types'
import { type Commitment, Connection, type ConnectionConfig } from '@solana/web3.js'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export const defaultRpcUrlFactory: RpcUrlFactory = (eid) => {
    switch (eid) {
        case EndpointId.SOLANA_V2_MAINNET:
        case EndpointId.SOLANA_MAINNET:
            return 'https://api.mainnet-beta.solana.com'

        case EndpointId.SOLANA_V2_TESTNET:
        case EndpointId.SOLANA_TESTNET:
            return 'https://api.devnet.solana.com'
    }

    throw new Error(`Could not find a default Solana RPC URL for eid ${eid} (${formatEid(eid)})`)
}

/**
 * Creates a Solana RPC URL factory with the ability to specify overrides
 * for specific `EndpointId`s.
 *
 * This is a convenience method for when custom RPC URLs can be provided, e.g.
 * from environment variables.
 *
 * ```
 * const rpcUrlFactory = createRpcUrlFactory({ [EndpointId.SOLANA_V2_MAINNET]: process.env.RPC_URL_SOLANA_MAINNET })
 * ```
 *
 * @param {Partial<Record<EndpointId, string | null>>} [overrides] An object mapping `EndpointId`s to RPC URLs.
 * @returns {RpcUrlFactory}
 */
export const createRpcUrlFactory =
    (overrides: Partial<Record<EndpointId, string | null>> = {}): RpcUrlFactory =>
    (eid) =>
        overrides[eid] ?? defaultRpcUrlFactory(eid)

export const createConnectionFactory = (
    urlFactory = defaultRpcUrlFactory,
    commitmentOrConfig?: Commitment | ConnectionConfig
): ConnectionFactory => pMemoize(async (eid) => new Connection(await urlFactory(eid), commitmentOrConfig))
