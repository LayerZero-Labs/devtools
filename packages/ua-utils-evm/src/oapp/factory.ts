import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-utils'
import type { OmniContractFactory } from '@layerzerolabs/utils-evm'
import type { EndpointFactory } from '@layerzerolabs/protocol-utils'
import { createEndpointFactory } from '@layerzerolabs/protocol-utils-evm'
import { OApp } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `OApp` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 * and an (optional) `EndpointFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @param {EndpointFactory} [endpointFactory]
 * @returns {EndpointFactory<Endpoint>}
 */
export const createOAppFactory = (
    contractFactory: OmniContractFactory,
    endpointFactory: EndpointFactory = createEndpointFactory(contractFactory)
): OAppFactory<OApp> => pMemoize(async (point) => new OApp(await contractFactory(point), endpointFactory))
