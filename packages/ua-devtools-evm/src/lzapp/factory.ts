import pMemoize from 'p-memoize'
import type { LzAppFactory } from '@layerzerolabs/ua-devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import { LzApp } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `LZApp` SDK
 * based on an `OmniPoint` with help of a `ProviderFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {LzAppFactory<LZApp>}
 */
export const createLzAppFactory = (providerFactory: ProviderFactory): LzAppFactory<LzApp> =>
    pMemoize(async (point) => new LzApp(await providerFactory(point.eid), point))
