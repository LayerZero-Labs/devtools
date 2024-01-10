import pMemoize from 'p-memoize'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import type { ExecutorFactory } from '@layerzerolabs/protocol-devtools'
import { Executor } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `Executor` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {ExecutorFactory<Executor>}
 */
export const createExecutorFactory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint>
): ExecutorFactory<Executor, TOmniPoint> => pMemoize(async (point) => new Executor(await contractFactory(point)))
