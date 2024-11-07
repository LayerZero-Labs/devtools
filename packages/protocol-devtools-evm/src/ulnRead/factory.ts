import pMemoize from 'p-memoize'
import type { UlnReadFactory } from '@layerzerolabs/protocol-devtools'
import { UlnRead } from './sdk'
import type { OmniPoint } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `UlnRead` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {UlnReadFactory<UlnRead>}
 */
export const createUlnReadFactory = (providerFactory: ProviderFactory): UlnReadFactory<UlnRead, OmniPoint> =>
    pMemoize(async (point) => new UlnRead(await providerFactory(point.eid), point))
