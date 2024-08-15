import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { Contract } from '@ethersproject/contracts'
import { OApp } from '@/oapp/sdk'
import { OmniContract } from '@layerzerolabs/devtools-evm'
import { OwnableMixin } from '@/ownable/mixin'
import { areBytes32Equal } from '@layerzerolabs/devtools'

describe('ownable/mixin', () => {
    const jestFunctionArbitrary = fc.anything().map(() => jest.fn())

    const oappOmniContractArbitrary = fc.record({
        address: evmAddressArbitrary,
        owner: jestFunctionArbitrary,
        interface: fc.record({
            encodeFunctionData: jestFunctionArbitrary,
        }),
    }) as fc.Arbitrary<unknown> as fc.Arbitrary<Contract>

    const omniContractArbitrary: fc.Arbitrary<OmniContract> = fc.record({
        eid: endpointArbitrary,
        contract: oappOmniContractArbitrary,
    })

    describe('getOwner', () => {
        it('should call owner on the contract', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, evmAddressArbitrary, async (omniContract, owner) => {
                    omniContract.contract.owner.mockResolvedValue(owner)

                    const sdk = new OApp(omniContract)
                    const ownable = Object.assign(sdk, OwnableMixin)

                    expect(await ownable.getOwner()).toBe(owner)
                    expect(omniContract.contract.owner).toHaveBeenCalledTimes(1)
                })
            )
        })
    })

    describe('hasOwner', () => {
        it('should return true if the owner addresses match', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, evmAddressArbitrary, async (omniContract, owner) => {
                    omniContract.contract.owner.mockResolvedValue(owner)

                    const sdk = new OApp(omniContract)
                    const ownable = Object.assign(sdk, OwnableMixin)

                    expect(await ownable.hasOwner(owner)).toBeTruthy()
                })
            )
        })

        it('should return false if the owner addresses do not match', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, owner, user) => {
                        fc.pre(!areBytes32Equal(owner, user))

                        omniContract.contract.owner.mockResolvedValue(owner)

                        const sdk = new OApp(omniContract)
                        const ownable = Object.assign(sdk, OwnableMixin)

                        expect(await ownable.hasOwner(user)).toBeFalsy()
                    }
                )
            )
        })
    })

    describe('setOwner', () => {
        it('should encode data for a transferOwnership call', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, evmAddressArbitrary, async (omniContract, owner) => {
                    const sdk = new OApp(omniContract)
                    const ownable = Object.assign(sdk, OwnableMixin)
                    const encodeFunctionData = omniContract.contract.interface.encodeFunctionData as jest.Mock

                    encodeFunctionData.mockClear()

                    await ownable.setOwner(owner)

                    expect(encodeFunctionData).toHaveBeenCalledTimes(1)
                    expect(encodeFunctionData).toHaveBeenCalledWith('transferOwnership', [owner])
                })
            )
        })
    })
})
