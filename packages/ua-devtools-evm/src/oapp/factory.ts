import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import { OApp } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `OApp` SDK
 * based on an `OmniPoint` with help of a `ProviderFactory`
 *
 * @param {OmniContractFactory} providerFactory
 * @returns {EndpointV2Factory<EndpointV2>}
 */
export const createOAppFactory = (providerFactory: ProviderFactory): OAppFactory<OApp> =>
    pMemoize(async (point) => new OApp(await providerFactory(point.eid), point))
