import pMemoize from 'p-memoize'
import { OmniCounter } from '@/omnicounter/sdk'
import { OAppFactory } from '@layerzerolabs/ua-devtools'
import { OmniContractFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `OmniCounter` SDK based on an `OmniPoint` with help of an
 * `OmniContractFactory` and an (optional) `EndpointV2Factory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {EndpointV2Factory<Endpoint>}
 */
export const createOmniCounterFactory = (contractFactory: OmniContractFactory): OAppFactory<OmniCounter> =>
    pMemoize(async (point) => new OmniCounter(await contractFactory(point)))
