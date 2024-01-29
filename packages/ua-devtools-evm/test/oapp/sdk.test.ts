import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { Contract } from '@ethersproject/contracts'
import { OApp } from '@/oapp/sdk'
import { OmniContract, isZero, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { makeBytes32 } from '@layerzerolabs/devtools-evm'
import { formatEid } from '@layerzerolabs/devtools'

describe('oapp/sdk', () => {
    const nullishAddressArbitrary = fc.constantFrom(null, undefined, makeZeroAddress(), makeBytes32(makeZeroAddress()))
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

    const endpointFactory = jest.fn().mockRejectedValue('No endpoint')

    describe('getPeer', () => {
        it('should call peers on the contract', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, endpointArbitrary, async (omniContract, peerEid) => {
                    const sdk = new OApp(omniContract, endpointFactory)

                    await sdk.getPeer(peerEid)

                    expect(omniContract.contract.peers).toHaveBeenCalledTimes(1)
                    expect(omniContract.contract.peers).toHaveBeenCalledWith(peerEid)
                })
            )
        })

        it('should return undefined if peers() returns a zero address, null or undefined', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    nullishAddressArbitrary,
                    async (omniContract, peerEid, peer) => {
                        omniContract.contract.peers.mockResolvedValue(peer)

                        const sdk = new OApp(omniContract, endpointFactory)

                        await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                    }
                )
            )
        })

        it('should return undefined if peers() returns null or undefined', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    endpointArbitrary,
                    evmAddressArbitrary,
                    async (omniContract, peerEid, peer) => {
                        omniContract.contract.peers.mockResolvedValue(peer)

                        const sdk = new OApp(omniContract, endpointFactory)

                        await expect(sdk.getPeer(peerEid)).resolves.toBe(peer)
                    }
                )
            )
        })
    })

    describe('hasPeer', () => {
        describe('when called with zeroish address', () => {
            it('should return true if peers returns a zero address', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        endpointArbitrary,
                        nullishAddressArbitrary,
                        nullishAddressArbitrary,
                        async (omniContract, peerEid, peer, probePeer) => {
                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract, endpointFactory)

                            await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(true)
                        }
                    )
                )
            })

            it('should return false if peers returns a non-zero address', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        endpointArbitrary,
                        nullishAddressArbitrary,
                        evmAddressArbitrary,
                        async (omniContract, peerEid, peer, probePeer) => {
                            fc.pre(!isZero(probePeer))

                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract, endpointFactory)

                            await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(false)
                        }
                    )
                )
            })
        })

        describe('when called non-zeroish address', () => {
            it('should return false if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        endpointArbitrary,
                        evmAddressArbitrary,
                        nullishAddressArbitrary,
                        async (omniContract, peerEid, peer, probePeer) => {
                            fc.pre(!isZero(peer))

                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract, endpointFactory)

                            await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(false)
                            await expect(sdk.hasPeer(peerEid, makeBytes32(probePeer))).resolves.toBe(false)
                        }
                    )
                )
            })

            it('should return true if peers() returns a matching address', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        endpointArbitrary,
                        evmAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            fc.pre(!isZero(peer))

                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract, endpointFactory)

                            await expect(sdk.hasPeer(peerEid, peer)).resolves.toBe(true)
                            await expect(sdk.hasPeer(peerEid, makeBytes32(peer))).resolves.toBe(true)
                        }
                    )
                )
            })

            it('should return true if peers() returns a matching bytes32', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        endpointArbitrary,
                        evmAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            fc.pre(!isZero(peer))

                            omniContract.contract.peers.mockResolvedValue(makeBytes32(peer))

                            const sdk = new OApp(omniContract, endpointFactory)

                            await expect(sdk.hasPeer(peerEid, peer)).resolves.toBe(true)
                            await expect(sdk.hasPeer(peerEid, makeBytes32(peer))).resolves.toBe(true)
                        }
                    )
                )
            })
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
                        const sdk = new OApp(omniContract, endpointFactory)
                        const encodeFunctionData = omniContract.contract.interface.encodeFunctionData

                        ;(encodeFunctionData as jest.Mock).mockClear()

                        await sdk.setPeer(peerEid, peerAddress)

                        expect(encodeFunctionData).toHaveBeenCalledTimes(1)
                        expect(encodeFunctionData).toHaveBeenCalledWith('setPeer', [peerEid, makeBytes32(peerAddress)])
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

                        const sdk = new OApp(omniContract, endpointFactory)
                        const transaction = await sdk.setPeer(peerEid, peerAddress)

                        expect(transaction).toEqual({
                            data,
                            description: `Setting peer for eid ${peerEid} (${formatEid(peerEid)}) to address ${makeBytes32(peerAddress)}`,
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

    describe('getEndpointSDK', () => {
        it('should reject if the call to endpoint() rejects', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, async (omniContract) => {
                    omniContract.contract.endpoint.mockRejectedValue('No you did not')

                    const sdk = new OApp(omniContract, endpointFactory)

                    await expect(sdk.getEndpointSDK()).rejects.toThrow(/Failed to get endpoint address for OApp/)
                })
            )
        })

        it('should reject if the call to endpoint() resolves with a zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    nullishAddressArbitrary,
                    async (omniContract, endpointAddress) => {
                        omniContract.contract.endpoint.mockResolvedValue(endpointAddress)

                        const sdk = new OApp(omniContract, endpointFactory)

                        await expect(sdk.getEndpointSDK()).rejects.toThrow(
                            /Endpoint cannot be instantiated: Endpoint address has been set to a zero value for OApp/
                        )
                    }
                )
            )
        })

        it('should call the endpointFactory if the call to endpoint() resolves with a non-zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    evmAddressArbitrary,
                    fc.anything(),
                    async (omniContract, endpointAddress, endpointSdk) => {
                        fc.pre(!isZero(endpointAddress))

                        omniContract.contract.endpoint.mockResolvedValue(endpointAddress)

                        endpointFactory.mockReset().mockResolvedValue(endpointSdk)

                        const sdk = new OApp(omniContract, endpointFactory)
                        const endpoint = await sdk.getEndpointSDK()

                        expect(endpoint).toBe(endpointSdk)

                        expect(endpointFactory).toHaveBeenCalledTimes(1)
                        expect(endpointFactory).toHaveBeenCalledWith({
                            eid: omniContract.eid,
                            address: endpointAddress,
                        })
                    }
                )
            )
        })
    })
})
