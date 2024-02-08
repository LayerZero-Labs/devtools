import pMemoize from 'p-memoize'
import { OmniCounter } from '@/omnicounter/sdk'
import { createEndpointV2Factory } from '@layerzerolabs/protocol-devtools-evm'
import { EndpointV2Factory } from '@layerzerolabs/protocol-devtools'
import { OAppFactory } from '@layerzerolabs/ua-devtools'
import { OmniContractFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `OmniCounter` SDK based on an `OmniPoint` with help of an
 * `OmniContractFactory` and an (optional) `EndpointV2Factory`
 *
 * @param {OmniContractFactory} contractFactory
 * @param {EndpointV2Factory} [EndpointV2Factory]
 * @returns {EndpointV2Factory<Endpoint>}
 */
export const createOmniCounterFactory = (
    contractFactory: OmniContractFactory,
    EndpointV2Factory: EndpointV2Factory = createEndpointV2Factory(contractFactory)
): OAppFactory<OmniCounter> =>
    pMemoize(async (point) => new OmniCounter(await contractFactory(point), EndpointV2Factory))
