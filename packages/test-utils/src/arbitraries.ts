import fc from 'fast-check'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS } from './constants'

export const addressArbitrary = fc.string()

export const evmAddressArbitrary = fc.hexaString({ minLength: 40, maxLength: 40 }).map((address) => `0x${address}`)

export const endpointArbitrary: fc.Arbitrary<EndpointId> = fc.constantFrom(...ENDPOINT_IDS)
