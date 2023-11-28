import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-utils'
import { Contract } from '@ethersproject/contracts'
import { OApp } from '@/oapp/sdk'
import { OmniContract, makeZero } from '@layerzerolabs/utils-evm'

describe('oapp/sdk', () => {
    const jestFunctionArbitrary = fc.anything().map(() => jest.fn())

    const oappOmniContractArbitrary = fc.record({
        address: evmAddressArbitrary,
        peers: jestFunctionArbitrary,
        interface: fc.record({
            encodeFunctionData: jestFunctionArbitrary,
        }),
    }) as fc.Arbitrary<unknown> as fc.Arbitrary<Contract>

    const omniContractArbitrary: fc.Arbitrary<OmniContract> = fc.record({
        eid: endpointArbitrary,
        contract: oappOmniContractArbitrary,
    })

    describe('peers', () => {
        it('should call peers on the contract', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, endpointArbitrary, async (omniContract, peerEid) => {
                    const sdk = new OApp(omniContract)

                    await sdk.peers(peerEid)

                    expect(omniContract.contract.peers).toHaveBeenCalledTimes(1)
                    expect(omniContract.contract.peers).toHaveBeenCalledWith(peerEid)
                })
            )
        })

        it('should return undefined if peers() returns a zero address, null or undefined', async () => {
            const peerArbitrary = fc.constantFrom(null, undefined, makeZero(null))

            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    peerArbitrary,
                    async (omniContract, peerEid, peer) => {
                        omniContract.contract.peers.mockResolvedValue(peer)

                        const sdk = new OApp(omniContract)

                        expect(sdk.peers(peerEid)).resolves.toBeUndefined()
                    }
                )
            )
        })

        it('should return undefined if peers() returns null or undefined', async () => {
            const peerArbitrary = evmAddressArbitrary

            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    peerArbitrary,
                    async (omniContract, peerEid, peer) => {
                        omniContract.contract.peers.mockResolvedValue(peer)

                        const sdk = new OApp(omniContract)

                        expect(sdk.peers(peerEid)).resolves.toBe(peer)
                    }
                )
            )
        })
    })

    describe('setPeer', () => {
        it('should encode data for a setPeer call', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, peerEid, peerAddress) => {
                        const sdk = new OApp(omniContract)
                        const encodeFunctionData = omniContract.contract.interface.encodeFunctionData

                        await sdk.setPeer(peerEid, peerAddress)

                        expect(encodeFunctionData).toHaveBeenCalledTimes(1)
                        expect(encodeFunctionData).toHaveBeenCalledWith('setPeer', [peerEid, makeZero(peerAddress)])
                    }
                )
            )
        })

        it('should return an OmniTransaction', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    fc.string(),
                    async (omniContract, peerEid, peerAddress, data) => {
                        const encodeFunctionData = omniContract.contract.interface.encodeFunctionData as jest.Mock
                        encodeFunctionData.mockReturnValue(data)

                        const sdk = new OApp(omniContract)
                        const transaction = await sdk.setPeer(peerEid, peerAddress)

                        expect(transaction).toEqual({
                            data,
                            point: {
                                eid: omniContract.eid,
                                address: omniContract.contract.address,
                            },
                        })
                    }
                )
            )
        })
    })
})
