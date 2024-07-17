import pMemoize from 'p-memoize'
import type { RpcUrlFactory } from '@layerzerolabs/devtools'
import { ConnectionFactory } from './types'
import { type Commitment, Connection, type ConnectionConfig } from '@solana/web3.js'

export const createConnectionFactory = (
    urlFactory: RpcUrlFactory,
    commitmentOrConfig?: Commitment | ConnectionConfig
): ConnectionFactory => pMemoize(async (eid) => new Connection(await urlFactory(eid), commitmentOrConfig))
