import fc from 'fast-check'
import { evmAddressArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { addChecksum, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { areBytes32Equal } from '@layerzerolabs/devtools'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Ownable } from '@/ownable'

describe('ownable/mixin', () => {
    describe('getOwner', () => {
        it('should call owner on the contract', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, evmAddressArbitrary, async (point, owner) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new Ownable(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('owner', [owner])
                    )

                    expect(await sdk.getOwner()).toBe(addChecksum(owner))
                })
            )
        })
    })

    describe('hasOwner', () => {
        it('should return true if the owner addresses match', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, evmAddressArbitrary, async (point, owner) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new Ownable(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('owner', [owner])
                    )

                    expect(await sdk.hasOwner(owner)).toBeTruthy()
                })
            )
        })

        it('should return false if the owner addresses do not match', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    async (point, owner, user) => {
                        fc.pre(!areBytes32Equal(owner, user))

                        const provider = new JsonRpcProvider()
                        const sdk = new Ownable(provider, point)

                        jest.spyOn(provider, 'call').mockResolvedValue(
                            sdk.contract.contract.interface.encodeFunctionResult('owner', [owner])
                        )

                        expect(await sdk.hasOwner(user)).toBeFalsy()
                    }
                )
            )
        })
    })

    describe('setOwner', () => {
        it('should encode data for a transferOwnership call', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, evmAddressArbitrary, async (point, owner) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new Ownable(provider, point)

                    expect(await sdk.setOwner(owner)).toEqual({
                        data: sdk.contract.contract.interface.encodeFunctionData('transferOwnership', [owner]),
                        description: `Setting owner to address ${makeZeroAddress(owner)}`,
                        point,
                    })
                })
            )
        })
    })
})
