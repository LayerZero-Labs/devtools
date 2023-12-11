import pMemoize from 'p-memoize'
import type { OmniContractFactory } from '@layerzerolabs/utils-evm'
import type { Uln302Factory } from '@layerzerolabs/protocol-utils'
import { Uln302 } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `Uln302` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {Uln302Factory<Uln302>}
 */
export const createUln302Factory = (contractFactory: OmniContractFactory): Uln302Factory<Uln302> =>
    pMemoize(async (point) => new Uln302(await contractFactory(point)))
