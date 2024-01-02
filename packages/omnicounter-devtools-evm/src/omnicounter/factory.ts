import pMemoize from 'p-memoize'
import { OmniCounter } from '@/omnicounter/sdk'
import { createEndpointFactory } from '@layerzerolabs/protocol-devtools-evm'
import { EndpointFactory } from '@layerzerolabs/protocol-devtools'
import { OAppFactory } from '@layerzerolabs/ua-devtools'
import { OmniContractFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `OmniCounter` SDK based on an `OmniPoint` with help of an
 * `OmniContractFactory` and an (optional) `EndpointFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @param {EndpointFactory} [endpointFactory]
 * @returns {EndpointFactory<Endpoint>}
 */
export const createOmniCounterFactory = (
    contractFactory: OmniContractFactory,
    endpointFactory: EndpointFactory = createEndpointFactory(contractFactory)
): OAppFactory<OmniCounter> => pMemoize(async (point) => new OmniCounter(await contractFactory(point), endpointFactory))
