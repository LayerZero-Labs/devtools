import pMemoize from 'p-memoize'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import type { DVNFactory } from '@layerzerolabs/protocol-devtools'
import { DVN } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `DVN` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {DVNFactory<DVN>}
 */
export const createDVNFactory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint>
): DVNFactory<DVN, TOmniPoint> => pMemoize(async (point) => new DVN(await contractFactory(point)))
