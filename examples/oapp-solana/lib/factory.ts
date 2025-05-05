import pMemoize from 'p-memoize'

import {
    type ConnectionFactory,
    type PublicKeyFactory,
    createConnectionFactory,
    defaultRpcUrlFactory,
} from '@layerzerolabs/devtools-solana'

import { CustomOAppSDK } from './sdk'

import type { OAppFactory } from '@layerzerolabs/ua-devtools'

/**
 * Syntactic sugar that creates an instance of Solana `OApp` SDK
 * based on an `OmniPoint` with help of an `ConnectionFactory`
 * and a `PublicKeyFactory`
 *
 * @param {PublicKeyFactory} userAccountFactory A function that accepts an `OmniPoint` representing an OApp and returns the user wallet public key
 * @param {ConnectionFactory} connectionFactory A function that returns a `Connection` based on an `EndpointId`
 * @returns {OAppFactory<CustomOAppSDK>}
 */
export const createSimpleOAppFactory = (
    userAccountFactory: PublicKeyFactory,
    programIdFactory: PublicKeyFactory,
    connectionFactory: ConnectionFactory = createConnectionFactory(defaultRpcUrlFactory)
): OAppFactory<CustomOAppSDK> =>
    pMemoize(
        async (point) =>
            new CustomOAppSDK(
                await connectionFactory(point.eid),
                point,
                await userAccountFactory(point),
                await programIdFactory(point)
            )
    )
