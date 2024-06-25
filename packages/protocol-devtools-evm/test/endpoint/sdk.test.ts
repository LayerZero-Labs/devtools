import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import type { Contract } from '@ethersproject/contracts'
import { makeZeroAddress, type OmniContract } from '@layerzerolabs/devtools-evm'
import { EndpointV2 } from '../../src/endpointv2'
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
                    const sdk = new EndpointV2(omniContract, uln302Factory)

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

                        const sdk = new EndpointV2(omniContract, uln302Factory)
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

    describe('getReceiveLibrary', () => {
        const jestFunctionArbitrary = fc.anything().map(() => jest.fn())
        const endpointContractArbitrary = fc.record({
            address: evmAddressArbitrary,
            getReceiveLibrary: jestFunctionArbitrary,
            interface: fc.record({
                parseError: jestFunctionArbitrary,
            }),
        }) as fc.Arbitrary<unknown> as fc.Arbitrary<Contract>

        const omniContractArbitrary: fc.Arbitrary<OmniContract> = fc.record({
            eid: endpointArbitrary,
            contract: endpointContractArbitrary,
        })

        const uln302Factory = jest.fn().mockRejectedValue('No endpoint')

        it('should return a tuple if the call succeeds', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    fc.boolean(),
                    async (omniContract, eid, oappAddress, libraryAddress, isDefault) => {
                        const sdk = new EndpointV2(omniContract, uln302Factory)

                        omniContract.contract.getReceiveLibrary.mockResolvedValue([libraryAddress, isDefault])

                        await expect(sdk.getReceiveLibrary(oappAddress, eid)).resolves.toEqual([
                            libraryAddress,
                            isDefault,
                        ])
                    }
                )
            )
        })

        it('should return undefined as the default lib if the call fails with LZ_DefaultReceiveLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, eid, oappAddress) => {
                        const sdk = new EndpointV2(omniContract, uln302Factory)
                        const error = { data: '0x78e84d06' }

                        // The LZ_DefaultReceiveLibUnavailable error
                        omniContract.contract.getReceiveLibrary.mockRejectedValue(error)

                        // Mock the contract interface since we don't have the ABI
                        ;(omniContract.contract.interface.parseError as jest.Mock).mockReturnValue({
                            name: 'LZ_DefaultReceiveLibUnavailable',
                            args: [],
                        })

                        await expect(sdk.getReceiveLibrary(oappAddress, eid)).resolves.toEqual([undefined, true])

                        expect(omniContract.contract.interface.parseError).toHaveBeenCalledWith(error.data)
                    }
                )
            )
        })

        it('should reject if call fails but not with LZ_DefaultReceiveLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, eid, oappAddress) => {
                        const sdk = new EndpointV2(omniContract, uln302Factory)
                        const error = { data: '0x86957466' }

                        omniContract.contract.getReceiveLibrary.mockRejectedValue(error)
                        ;(omniContract.contract.interface.parseError as jest.Mock).mockReturnValue({
                            name: 'SomeOtherError',
                            args: [],
                        })

                        await expect(sdk.getReceiveLibrary(oappAddress, eid)).rejects.toEqual(error)

                        expect(omniContract.contract.interface.parseError).toHaveBeenCalledWith(error.data)
                    }
                )
            )
        })
    })

    describe('getSendLibrary', () => {
        const jestFunctionArbitrary = fc.anything().map(() => jest.fn())
        const endpointContractArbitrary = fc.record({
            address: evmAddressArbitrary,
            getSendLibrary: jestFunctionArbitrary,
            interface: fc.record({
                parseError: jestFunctionArbitrary,
            }),
        }) as fc.Arbitrary<unknown> as fc.Arbitrary<Contract>

        const omniContractArbitrary: fc.Arbitrary<OmniContract> = fc.record({
            eid: endpointArbitrary,
            contract: endpointContractArbitrary,
        })

        const uln302Factory = jest.fn().mockRejectedValue('No endpoint')

        it('should return an address if the call succeeds', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, eid, oappAddress, libraryAddress) => {
                        const sdk = new EndpointV2(omniContract, uln302Factory)

                        omniContract.contract.getSendLibrary.mockResolvedValue(libraryAddress)

                        await expect(sdk.getSendLibrary(oappAddress, eid)).resolves.toEqual(libraryAddress)
                    }
                )
            )
        })

        it('should return undefined if the call fails with LZ_DefaultSendLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, eid, oappAddress) => {
                        const sdk = new EndpointV2(omniContract, uln302Factory)
                        const error = { data: '0x6c1ccdb5' }

                        // The LZ_DefaultReceiveLibUnavailable error
                        omniContract.contract.getSendLibrary.mockRejectedValue(error)

                        // Mock the contract interface since we don't have the ABI
                        ;(omniContract.contract.interface.parseError as jest.Mock).mockReturnValue({
                            name: 'LZ_DefaultSendLibUnavailable',
                            args: [],
                        })

                        await expect(sdk.getSendLibrary(oappAddress, eid)).resolves.toEqual(undefined)

                        expect(omniContract.contract.interface.parseError).toHaveBeenCalledWith(error.data)
                    }
                )
            )
        })

        it('should reject if call fails but not with LZ_DefaultSendLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, eid, oappAddress) => {
                        const sdk = new EndpointV2(omniContract, uln302Factory)
                        const error = { data: '0x86957466' }

                        omniContract.contract.getSendLibrary.mockRejectedValue(error)
                        ;(omniContract.contract.interface.parseError as jest.Mock).mockReturnValue({
                            name: 'SomeOtherError',
                            args: [],
                        })

                        await expect(sdk.getSendLibrary(oappAddress, eid)).rejects.toEqual(error)

                        expect(omniContract.contract.interface.parseError).toHaveBeenCalledWith(error.data)
                    }
                )
            )
        })
    })
})
