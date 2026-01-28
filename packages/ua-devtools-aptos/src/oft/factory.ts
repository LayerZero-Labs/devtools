import type { OmniPoint } from '@layerzerolabs/devtools'
import type { OAppFactory } from '@layerzerolabs/ua-devtools'
import { createConnectionFactory, type ConnectionFactory } from '@layerzerolabs/devtools-aptos'

import { OFT } from './sdk'

/**
 * Syntactic sugar that creates an instance of Aptos `OFT` SDK
 * based on an `OmniPoint` with help of a `ConnectionFactory`.
 *
 * @param {ConnectionFactory} connectionFactory A function that returns an `Aptos` client based on an `EndpointId`
 * @returns {OAppFactory<OFT>}
 */
export const createOFTFactory = (
    connectionFactory: ConnectionFactory = createConnectionFactory()
): OAppFactory<OFT> => {
    return async (point: OmniPoint): Promise<OFT> => {
        return new OFT(point, connectionFactory)
    }
}
