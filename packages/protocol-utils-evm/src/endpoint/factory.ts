import pMemoize from 'p-memoize'
import { OmniContractFactory } from '@layerzerolabs/utils-evm'
import { Endpoint } from './sdk'
import { EndpointFactory } from '@layerzerolabs/protocol-utils'

/**
 * Syntactic sugar that creates an instance of EVM `Endpoint` SDK
 * based on an `OmniPoint` with help of an `OmniContractFactory`
 *
 * @param {OmniContractFactory} contractFactory
 * @returns {EndpointFactory<Endpoint>}
 */
export const createEndpointFactory = (contractFactory: OmniContractFactory): EndpointFactory<Endpoint> =>
    pMemoize(async (point) => new Endpoint(await contractFactory(point)))
