import pMemoize from 'p-memoize'
import type { OAppFactory } from '@layerzerolabs/ua-devtools'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import { OAppRead } from './sdk'

/**
 * Syntactic sugar that creates an instance of EVM `OApp` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 * and an (optional) `EndpointV2Factory`
 *
 * @param {OmniContractFactory} contractFactory
 * @param {EndpointV2Factory} [EndpointV2Factory]
 * @returns {EndpointV2Factory<EndpointV2>}
 */
export const createOAppReadFactory = (contractFactory: OmniContractFactory): OAppFactory<OAppRead> =>
    pMemoize(async (point) => new OAppRead(await contractFactory(point)))
