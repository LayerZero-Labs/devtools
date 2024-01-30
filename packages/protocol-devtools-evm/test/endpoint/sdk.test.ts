import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import type { Contract } from '@ethersproject/contracts'
import { makeZeroAddress, type OmniContract } from '@layerzerolabs/devtools-evm'
import { Endpoint } from '@/endpoint'
import { isZero, makeBytes32 } from '@layerzerolabs/devtools'

describe('endpoint/sdk', () => {
    describe('getUln302SDK', () => {
        const zeroishAddressArbitrary = fc.constantFrom(makeZeroAddress(), makeBytes32())
        const jestFunctionArbitrary = fc.anything().map(() => jest.fn())
        const oappOmniContractArbitrary = fc.record({
            address: evmAddressArbitrary,
            peers: jestFunctionArbitrary,
            endpoint: jestFunctionArbitrary,
            interface: fc.record({
                encodeFunctionData: jestFunctionArbitrary,
            }),
        }) as fc.Arbitrary<unknown> as fc.Arbitrary<Contract>

        const omniContractArbitrary: fc.Arbitrary<OmniContract> = fc.record({
            eid: endpointArbitrary,
            contract: oappOmniContractArbitrary,
        })

        const uln302Factory = jest.fn().mockRejectedValue('No endpoint')

        it('should reject if the address is a zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, zeroishAddressArbitrary, async (omniContract, address) => {
                    const sdk = new Endpoint(omniContract, uln302Factory)

                    await expect(sdk.getUln302SDK(address)).rejects.toThrow(
                        /Uln302 cannot be instantiated: Uln302 address cannot be a zero value for Endpoint/
                    )
                })
            )
        })

        it('should call the uln302Factory if the address is a non-zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (omniContract, address, uln302Sdk) => {
                        fc.pre(!isZero(address))

                        uln302Factory.mockReset().mockResolvedValue(uln302Sdk)

                        const sdk = new Endpoint(omniContract, uln302Factory)
                        const uln302 = await sdk.getUln302SDK(address)

                        expect(uln302).toBe(uln302Sdk)

                        expect(uln302Factory).toHaveBeenCalledTimes(1)
                        expect(uln302Factory).toHaveBeenCalledWith({
                            eid: omniContract.eid,
                            address,
                        })
                    }
                )
            )
        })
    })
})
