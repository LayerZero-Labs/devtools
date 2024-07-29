import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-devtools'
import { OFT } from './sdk'
import {
    type ConnectionFactory,
    type PublicKeyFactory,
    createConnectionFactory,
    defaultRpcUrlFactory,
} from '@layerzerolabs/devtools-solana'

/**
 * Syntactic sugar that creates an instance of Solana `OFT` SDK
 * based on an `OmniPoint` with help of an `ConnectionFactory`
 * and a `PublicKeyFactory`
 *
 * @param {PublicKeyFactory} userAccountFactory A function that accepts an `OmniPoint` representing an OFT and returns the user wallet public key
 * @param {PublicKeyFactory} mintAccountFactory A function that accepts an `OmniPoint` representing an OFT and returns the mint public key
 * @param {ConnectionFactory} connectionFactory A function that returns a `Connection` based on an `EndpointId`
 * @returns {OAppFactory<OFT>}
 */
export const createOFTFactory = (
    userAccountFactory: PublicKeyFactory,
    programIdFactory: PublicKeyFactory,
    connectionFactory: ConnectionFactory = createConnectionFactory(defaultRpcUrlFactory)
): OAppFactory<OFT> =>
    pMemoize(
        async (point) =>
            new OFT(
                await connectionFactory(point.eid),
                point,
                await userAccountFactory(point),
                await programIdFactory(point)
            )
    )
