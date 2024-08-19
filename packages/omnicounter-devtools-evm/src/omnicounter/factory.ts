import pMemoize from 'p-memoize'
import { OmniCounter } from '@/omnicounter/sdk'
import { OAppFactory } from '@layerzerolabs/ua-devtools'
import { ProviderFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `OmniCounter` SDK based on an `OmniPoint` with help of a
 * `ProviderFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {OAppFactory<OmniCounter>}
 */
export const createOmniCounterFactory = (providerFactory: ProviderFactory): OAppFactory<OmniCounter> =>
    pMemoize(async (point) => new OmniCounter(await providerFactory(point.eid), point))
