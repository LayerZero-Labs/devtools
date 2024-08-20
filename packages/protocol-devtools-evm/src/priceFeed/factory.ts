import pMemoize from 'p-memoize'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import type { PriceFeedFactory } from '@layerzerolabs/protocol-devtools'
import { PriceFeed } from './sdk'
import type { OmniPoint } from '@layerzerolabs/devtools'

/**
 * Syntactic sugar that creates an instance of EVM `PriceFeed` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {PriceFeedFactory<PriceFeed>}
 */
export const createPriceFeedFactory = (providerFactory: ProviderFactory): PriceFeedFactory<PriceFeed, OmniPoint> =>
    pMemoize(async (point) => new PriceFeed(await providerFactory(point.eid), point))
