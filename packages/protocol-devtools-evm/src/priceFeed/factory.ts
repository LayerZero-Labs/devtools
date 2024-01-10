import pMemoize from 'p-memoize'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import type { PriceFeedFactory } from '@layerzerolabs/protocol-devtools'
import { PriceFeed } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `PriceFeed` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {PriceFeedFactory<PriceFeed>}
 */
export const createPriceFeedFactory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint>
): PriceFeedFactory<PriceFeed, TOmniPoint> => pMemoize(async (point) => new PriceFeed(await contractFactory(point)))
