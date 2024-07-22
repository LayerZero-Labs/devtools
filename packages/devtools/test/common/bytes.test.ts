import { denormalizePeer, normalizePeer } from '@/common/bytes'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import {
    aptosAddressArbitrary,
    endpointArbitrary,
    evmAddressArbitrary,
    solanaAddressArbitrary,
} from '@layerzerolabs/test-devtools'
import fc from 'fast-check'

describe('common/bytes', () => {
    describe('normalizePeer', () => {
        describe('for EVM', () => {
            const evmEndpointArbitrary = endpointArbitrary.filter((eid) => endpointIdToChainType(eid) === ChainType.EVM)

            it('should normalize a peer correctly', () => {
                fc.assert(
                    fc.property(evmEndpointArbitrary, evmAddressArbitrary, (eid, address) => {
                        const normalized = normalizePeer(address, eid)
                        const denormalized = denormalizePeer(normalized, eid)

                        expect(denormalized).toBe(address)
                    })
                )
            })
        })

        describe('for APTOS', () => {
            const aptosEndpointArbitrary = endpointArbitrary.filter(
                (eid) => endpointIdToChainType(eid) === ChainType.APTOS
            )

            it('should normalize a peer correctly', () => {
                fc.assert(
                    fc.property(aptosEndpointArbitrary, aptosAddressArbitrary, (eid, address) => {
                        const normalized = normalizePeer(address, eid)
                        const denormalized = denormalizePeer(normalized, eid)

                        expect(denormalized).toBe(address)
                    })
                )
            })
        })

        describe('for SOLANA', () => {
            const solanaEndpointArbitrary = endpointArbitrary.filter(
                (eid) => endpointIdToChainType(eid) === ChainType.SOLANA
            )

            it('should normalize a peer correctly', () => {
                fc.assert(
                    fc.property(solanaEndpointArbitrary, solanaAddressArbitrary, (eid, address) => {
                        const normalized = normalizePeer(address, eid)
                        const denormalized = denormalizePeer(normalized, eid)

                        expect(denormalized).toBe(address)
                    })
                )
            })
        })
    })
})
