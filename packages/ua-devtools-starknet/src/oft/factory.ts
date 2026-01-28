import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-devtools'
import { OFT } from './sdk'
import { type ConnectionFactory, createConnectionFactory, defaultRpcUrlFactory } from '@layerzerolabs/devtools-starknet'

/**
 * Syntactic sugar that creates an instance of Starknet `OFT` SDK
 * based on an `OmniPoint` with help of an `ConnectionFactory`.
 *
 * @param {ConnectionFactory} connectionFactory A function that returns a `RpcProvider` based on an `EndpointId`
 * @returns {OAppFactory<OFT>}
 */
export const createOFTFactory = (
    connectionFactory: ConnectionFactory = createConnectionFactory(defaultRpcUrlFactory)
): OAppFactory<OFT> => pMemoize(async (point) => new OFT(await connectionFactory(point.eid), point))
