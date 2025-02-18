import pMemoize from 'p-memoize'

import { OmniPoint } from '@layerzerolabs/devtools'

import { ERC20 } from './sdk'
import { ERC20Factory } from './types'

import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'

/**
 * Syntactic sugar that creates an instance of EVM `ERC20` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {ERC20Factory<ERC20>}
 */
export const createERC20Factory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint | OmniPoint>
): ERC20Factory<ERC20, TOmniPoint> => pMemoize(async (point) => new ERC20(await contractFactory(point)))
