import pMemoize from 'p-memoize'
import type { LzAppFactory } from '@layerzerolabs/ua-devtools'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import { LzApp } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `LZApp` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {LzAppFactory<LZApp>}
 */
export const createLzAppFactory = (contractFactory: OmniContractFactory): LzAppFactory<LzApp> =>
    pMemoize(async (point) => new LzApp(await contractFactory(point)))
