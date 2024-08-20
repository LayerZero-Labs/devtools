import pMemoize from 'p-memoize'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import type { DVNFactory } from '@layerzerolabs/protocol-devtools'
import { DVN } from './sdk'
import { OmniPoint } from '@layerzerolabs/devtools'

/**
 * Syntactic sugar that creates an instance of EVM `DVN` SDK
 * based on an `OmniPoint` with help of a `ProviderFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {DVNFactory<DVN>}
 */
export const createDVNFactory = (providerFactory: ProviderFactory): DVNFactory<DVN, OmniPoint> =>
    pMemoize(async (point) => new DVN(await providerFactory(point.eid), point))
