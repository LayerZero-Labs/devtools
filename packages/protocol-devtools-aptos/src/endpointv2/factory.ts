import type { OmniPoint, OmniSDKFactory } from '@layerzerolabs/devtools'
import type { ConnectionFactory } from '@layerzerolabs/devtools-aptos'

import { EndpointV2 } from './sdk'

/**
 * Factory for creating EndpointV2 SDK instances
 *
 * @param connectionFactory - Factory for creating Aptos client connections
 * @returns Factory function that creates EndpointV2 SDK instances for given OmniPoints
 */
export const createEndpointV2Factory = (connectionFactory?: ConnectionFactory): OmniSDKFactory<EndpointV2> => {
    return async (point: OmniPoint): Promise<EndpointV2> => {
        return new EndpointV2(point, connectionFactory)
    }
}
