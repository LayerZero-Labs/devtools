import pMemoize from 'p-memoize'
import type { EndpointFactory, Uln302Factory } from '@layerzerolabs/protocol-devtools'
import type { OmniPoint } from '@layerzerolabs/devtools'
import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import { Endpoint } from './sdk'
import { createUln302Factory } from '@/uln302/factory'

/**
 * Syntactic sugar that creates an instance of EVM `Endpoint` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {EndpointFactory<Endpoint>}
 */
export const createEndpointFactory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint | OmniPoint>,
    uln302Factory: Uln302Factory = createUln302Factory(contractFactory)
): EndpointFactory<Endpoint, TOmniPoint | OmniPoint> =>
    pMemoize(async (point) => new Endpoint(await contractFactory(point), uln302Factory))
