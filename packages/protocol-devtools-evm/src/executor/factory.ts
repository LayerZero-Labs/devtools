import pMemoize from 'p-memoize'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import type { ExecutorFactory } from '@layerzerolabs/protocol-devtools'
import { Executor } from './sdk'
import type { OmniPoint } from '@layerzerolabs/devtools'

/**
 * Syntactic sugar that creates an instance of EVM `Executor` SDK
 * based on an `OmniPoint` with help of a `ProviderFactory`
 *
 * @param {ProviderFactory} providerFactory
 * @returns {ExecutorFactory<Executor>}
 */
export const createExecutorFactory = (providerFactory: ProviderFactory): ExecutorFactory<Executor, OmniPoint> =>
    pMemoize(async (point) => new Executor(await providerFactory(point.eid), point))
