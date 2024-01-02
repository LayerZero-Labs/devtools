import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-devtools'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import type { EndpointFactory } from '@layerzerolabs/protocol-devtools'
import { createEndpointFactory } from '@layerzerolabs/protocol-devtools-evm'
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
