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
            return 'https://api.testnet.solana.com'
    }

    throw new Error(`Could not find a default Solana RPC URL for eid ${eid} (${formatEid(eid)})`)
}

export const createConnectionFactory = (
    urlFactory = defaultRpcUrlFactory,
    commitmentOrConfig?: Commitment | ConnectionConfig
): ConnectionFactory => pMemoize(async (eid) => new Connection(await urlFactory(eid), commitmentOrConfig))
