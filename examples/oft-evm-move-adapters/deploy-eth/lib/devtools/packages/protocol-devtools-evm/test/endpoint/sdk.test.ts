import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { addChecksum, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { EndpointV2 } from '../../src/endpointv2'
import { isZero, makeBytes32 } from '@layerzerolabs/devtools'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Uln302 } from '@/uln302'
import { LogLevel, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

jest.spyOn(JsonRpcProvider.prototype, 'detectNetwork').mockResolvedValue({ chainId: 1, name: 'mock' })

describe('endpoint/sdk', () => {
    beforeAll(() => {
        setDefaultLogLevel(LogLevel.error)
    })

    afterAll(() => {
        setDefaultLogLevel(LogLevel.info)
    })

    describe('getUln302SDK', () => {
        const zeroishAddressArbitrary = fc.constantFrom(makeZeroAddress(), makeBytes32())

        it('should reject if the address is a zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, zeroishAddressArbitrary, async (point, address) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new EndpointV2(provider, point)

                    await expect(sdk.getUln302SDK(address)).rejects.toThrow(
                        /Uln302 cannot be instantiated: Uln302 address cannot be a zero value for Endpoint/
                    )
                })
            )
        })

        it('should return a ULN302 if the address is a non-zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, evmAddressArbitrary, async (point, address) => {
                    fc.pre(!isZero(address))

                    const provider = new JsonRpcProvider()

                    const sdk = new EndpointV2(provider, point)
                    const uln302 = await sdk.getUln302SDK(address)

                    expect(uln302).toBeInstanceOf(Uln302)
                    expect(uln302.point).toEqual({ eid: point.eid, address })
                })
            )
        })
    })

    describe('getReceiveLibrary', () => {
        it('should return a tuple if the call succeeds', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    fc.boolean(),
                    async (point, eid, oappAddress, libraryAddress, isDefault) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new EndpointV2(provider, point)

                        jest.spyOn(provider, 'call').mockResolvedValue(
                            sdk.contract.contract.interface.encodeFunctionResult('getReceiveLibrary', [
                                libraryAddress,
                                isDefault,
                            ])
                        )

                        await expect(sdk.getReceiveLibrary(oappAddress, eid)).resolves.toEqual([
                            addChecksum(libraryAddress),
                            isDefault,
                        ])
                    }
                )
            )
        })

        it('should return undefined as the default lib if the call fails with LZ_DefaultReceiveLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (point, eid, oappAddress) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new EndpointV2(provider, point)
                        // The LZ_DefaultReceiveLibUnavailable error
                        const error = { data: '0x78e84d06' }

                        jest.spyOn(provider, 'call').mockRejectedValue(error)

                        await expect(sdk.getReceiveLibrary(oappAddress, eid)).resolves.toEqual([undefined, true])
                    }
                )
            )
        })

        it('should reject if call fails but not with LZ_DefaultReceiveLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (point, eid, oappAddress) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new EndpointV2(provider, point)
                        const error = { data: '0x86957466' }

                        jest.spyOn(provider, 'call').mockRejectedValue(error)

                        await expect(sdk.getReceiveLibrary(oappAddress, eid)).rejects.toEqual(error)
                    }
                )
            )
        })
    })

    describe('getSendLibrary', () => {
        it('should return an address if the call succeeds', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    async (point, eid, oappAddress, libraryAddress) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new EndpointV2(provider, point)

                        jest.spyOn(provider, 'call').mockResolvedValue(
                            sdk.contract.contract.interface.encodeFunctionResult('getSendLibrary', [libraryAddress])
                        )

                        await expect(sdk.getSendLibrary(oappAddress, eid)).resolves.toEqual(addChecksum(libraryAddress))
                    }
                )
            )
        })

        it('should return undefined if the call fails with LZ_DefaultSendLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (point, eid, oappAddress) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new EndpointV2(provider, point)
                        // The LZ_DefaultReceiveLibUnavailable error
                        const error = { data: '0x6c1ccdb5' }

                        jest.spyOn(provider, 'call').mockRejectedValue(error)

                        await expect(sdk.getSendLibrary(oappAddress, eid)).resolves.toEqual(undefined)
                    }
                )
            )
        })

        it('should reject if call fails but not with LZ_DefaultSendLibUnavailable', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (point, eid, oappAddress) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new EndpointV2(provider, point)
                        const error = { data: '0x86957466' }

                        jest.spyOn(provider, 'call').mockRejectedValue(error)

                        await expect(sdk.getSendLibrary(oappAddress, eid)).rejects.toEqual(error)
                    }
                )
            )
        })
    })
})
