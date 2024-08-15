import pMemoize from 'p-memoize'
import type { EndpointV2Factory } from '@layerzerolabs/protocol-devtools'
import type { OmniPoint } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import { EndpointV2 } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `Endpoint` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {EndpointV2Factory<EndpointV2>}
 */
export const createEndpointV2Factory = (providerFactory: ProviderFactory): EndpointV2Factory<EndpointV2, OmniPoint> =>
    pMemoize(async (point) => new EndpointV2(await providerFactory(point.eid), point))
