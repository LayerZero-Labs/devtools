import pMemoize from 'p-memoize'
import type { Uln302Factory } from '@layerzerolabs/protocol-devtools'
import { Uln302 } from './sdk'
import type { OmniPoint } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `Uln302` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {Uln302Factory<Uln302>}
 */
export const createUln302Factory = (providerFactory: ProviderFactory): Uln302Factory<Uln302, OmniPoint> =>
    pMemoize(async (point) => new Uln302(await providerFactory(point.eid), point))
