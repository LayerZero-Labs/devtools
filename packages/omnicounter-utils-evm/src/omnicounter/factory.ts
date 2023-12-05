import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-utils'
import type { OmniContractFactory } from '@layerzerolabs/utils-evm'
import type { EndpointFactory } from '@layerzerolabs/protocol-utils'
import { createEndpointFactory } from '@layerzerolabs/protocol-utils-evm'
import { OmniCounterApp } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `OmniCounterApp` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 * and an (optional) `EndpointFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @param {EndpointFactory} [endpointFactory]
 * @returns {EndpointFactory<Endpoint>}
 */
export const createOmniCounterAppFactory = (
    contractFactory: OmniContractFactory,
    endpointFactory: EndpointFactory = createEndpointFactory(contractFactory)
): OAppFactory<OmniCounterApp> =>
    pMemoize(async (point) => new OmniCounterApp(await contractFactory(point), endpointFactory))
