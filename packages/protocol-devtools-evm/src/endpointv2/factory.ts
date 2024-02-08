import pMemoize from 'p-memoize'
import type { EndpointV2Factory, Uln302Factory } from '@layerzerolabs/protocol-devtools'
import type { OmniPoint } from '@layerzerolabs/devtools'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import { EndpointV2 } from './sdk'
import { createUln302Factory } from '@/uln302/factory'

/**
 * Syntactic sugar that creates an instance of EVM `Endpoint` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @param {Uln302Factory} uln302Factory
 * @returns {EndpointV2Factory<EndpointV2>}
 */
export const createEndpointV2Factory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint | OmniPoint>,
    uln302Factory: Uln302Factory = createUln302Factory(contractFactory)
): EndpointV2Factory<EndpointV2, TOmniPoint | OmniPoint> =>
    pMemoize(async (point) => new EndpointV2(await contractFactory(point), uln302Factory))
