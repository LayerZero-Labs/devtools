import fc from 'fast-check'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'
import { ENDPOINT_IDS } from './constants'

export const addressArbitrary = fc.string()

export const evmAddressArbitrary = fc.hexaString({ minLength: 40, maxLength: 40 }).map((address) => `0x${address}`)

export const endpointArbitrary: fc.Arbitrary<EndpointId> = fc.constantFrom(...ENDPOINT_IDS)

export const stageArbitrary: fc.Arbitrary<Stage> = fc.constantFrom(Stage.MAINNET, Stage.TESTNET, Stage.SANDBOX)

export const pointArbitrary = fc.record({
    eid: endpointArbitrary,
    address: evmAddressArbitrary,
})

export const vectorArbitrary = fc.record({
    from: pointArbitrary,
    to: pointArbitrary,
})
