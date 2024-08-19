import pMemoize from 'p-memoize'

import type { OmniPoint } from '@layerzerolabs/devtools'

import { ERC20 } from './sdk'
import type { ERC20Factory } from './types'

import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `ERC20` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {ERC20Factory<ERC20>}
 */
export const createERC20Factory = (providerFactory: ProviderFactory): ERC20Factory<ERC20, OmniPoint> =>
    pMemoize(async (point) => new ERC20(await providerFactory(point.eid), point))
