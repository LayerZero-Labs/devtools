import fc from 'fast-check'
import { evmAddressArbitrary, endpointArbitrary } from '@layerzerolabs/test-devtools'
import { Contract } from '@ethersproject/contracts'
import { omniContractToPoint } from '@/omnigraph/coordinates'
import type { OmniContract } from '@/omnigraph/types'

describe('omnigraph/coordinates', () => {
    describe('omniContractToPoint', () => {
        it('should create an OmniPoint with the address of the contract', () => {
            fc.assert(
                fc.property(evmAddressArbitrary, endpointArbitrary, (address, eid) => {
                    const contract = new Contract(address, [])
                    const omniContract: OmniContract = { eid, contract }

                    expect(omniContractToPoint(omniContract)).toEqual({ eid, address })
                })
            )
        })
    })
})
