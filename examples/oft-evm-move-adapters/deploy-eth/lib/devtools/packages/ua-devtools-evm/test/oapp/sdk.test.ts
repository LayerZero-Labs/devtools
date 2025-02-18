import fc from 'fast-check'
import {
    aptosAddressArbitrary,
    aptosEndpointArbitrary,
    endpointArbitrary,
    evmAddressArbitrary,
    evmEndpointArbitrary,
    solanaAddressArbitrary,
    solanaEndpointArbitrary,
} from '@layerzerolabs/test-devtools'
import { Contract } from '@ethersproject/contracts'
import { OApp } from '@/oapp/sdk'
import { OmniContract, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { areBytes32Equal, isZero, makeBytes32, normalizePeer } from '@layerzerolabs/devtools'
import { formatEid } from '@layerzerolabs/devtools'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-evm'

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
        eid: evmEndpointArbitrary,
        contract: oappOmniContractArbitrary,
    })

    describe('getPeer', () => {
        it('should call peers on the contract', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, endpointArbitrary, async (omniContract, peerEid) => {
                    const sdk = new OApp(omniContract)

                    await sdk.getPeer(peerEid)

                    expect(omniContract.contract.peers).toHaveBeenCalledTimes(1)
                    expect(omniContract.contract.peers).toHaveBeenCalledWith(peerEid)
                })
            )
        })

        describe('for EVM', () => {
            it('should return undefined if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        evmEndpointArbitrary,
                        nullishAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract)

                            await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                        }
                    )
                )
            })

            it('should return an address if peers() returns a non-null bytes', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        evmEndpointArbitrary,
                        evmAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            fc.pre(!isZero(peer))

                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract)

                            await expect(sdk.getPeer(peerEid)).resolves.toBe(peer)
                        }
                    )
                )
            })
        })

        describe('for Solana', () => {
            it('should return undefined if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        solanaEndpointArbitrary,
                        nullishAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract)

                            await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                        }
                    )
                )
            })

            it('should return an address if peers() returns a non-null bytes', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        evmEndpointArbitrary,
                        solanaEndpointArbitrary,
                        solanaAddressArbitrary,
                        async (omniContract, eid, peerEid, peer) => {
                            // For Solana we need to take the native address format and turn it into EVM bytes32
                            //
                            // We do this by normalizing the value into a UInt8Array,
                            // then denormalizing it using an EVM eid
                            const peerBytes = normalizePeer(peer, peerEid)
                            const peerHex = makeBytes32(peerBytes)

                            fc.pre(!isZero(peerHex))

                            omniContract.contract.peers.mockResolvedValue(peerHex)

                            const sdk = new OApp(omniContract)

                            await expect(sdk.getPeer(peerEid)).resolves.toBe(peer)
                        }
                    )
                )
            })
        })

        describe('for Aptos', () => {
            it('should return undefined if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        aptosEndpointArbitrary,
                        nullishAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract)

                            await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                        }
                    )
                )
            })

            it('should return an address if peers() returns a non-null bytes', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        aptosEndpointArbitrary,
                        aptosAddressArbitrary,
                        async (omniContract, peerEid, peer) => {
                            fc.pre(!isZero(peer))

                            omniContract.contract.peers.mockResolvedValue(peer)

                            const sdk = new OApp(omniContract)

                            await expect(sdk.getPeer(peerEid)).resolves.toBe(peer)
                        }
                    )
                )
            })
        })
    })

    describe('hasPeer', () => {
        describe('when called with zeroish address', () => {
            describe('for EVM', () => {
                it('should return true if peers returns a zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            evmEndpointArbitrary,
                            nullishAddressArbitrary,
                            nullishAddressArbitrary,
                            async (omniContract, peerEid, peer, probePeer) => {
                                omniContract.contract.peers.mockResolvedValue(peer)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(true)
                            }
                        )
                    )
                })

                it('should return false if peers returns a non-zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            evmEndpointArbitrary,
                            nullishAddressArbitrary,
                            evmAddressArbitrary,
                            async (omniContract, peerEid, peer, probePeer) => {
                                fc.pre(!isZero(probePeer))

                                omniContract.contract.peers.mockResolvedValue(peer)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(false)
                            }
                        )
                    )
                })

                it('should return true if peers() returns a matching bytes32', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            evmEndpointArbitrary,
                            evmAddressArbitrary,
                            async (omniContract, peerEid, peer) => {
                                omniContract.contract.peers.mockResolvedValue(makeBytes32(peer))

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, peer)).resolves.toBe(true)
                                await expect(sdk.hasPeer(peerEid, makeBytes32(peer))).resolves.toBe(true)
                            }
                        )
                    )
                })
            })

            describe('for Solana', () => {
                it('should return true if peers returns a zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            solanaEndpointArbitrary,
                            nullishAddressArbitrary,
                            async (omniContract, peerEid, peer) => {
                                omniContract.contract.peers.mockResolvedValue(peer)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, undefined)).resolves.toBe(true)
                            }
                        )
                    )
                })

                it('should return false if peers returns a different value', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            solanaEndpointArbitrary,
                            solanaAddressArbitrary,
                            solanaAddressArbitrary,
                            async (omniContract, peerEid, peer, probePeer) => {
                                fc.pre(
                                    !areBytes32Equal(normalizePeer(peer, peerEid), normalizePeer(probePeer, peerEid))
                                )

                                const peerHex = makeBytes32(normalizePeer(peer, peerEid))

                                omniContract.contract.peers.mockResolvedValue(peerHex)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(false)
                            }
                        )
                    )
                })

                it('should return true if peers() returns a matching value', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            solanaEndpointArbitrary,
                            solanaAddressArbitrary,
                            async (omniContract, peerEid, peer) => {
                                const peerHex = makeBytes32(normalizePeer(peer, peerEid))

                                omniContract.contract.peers.mockResolvedValue(peerHex)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, peer)).resolves.toBe(true)
                            }
                        )
                    )
                })
            })

            describe('for Aptos', () => {
                it('should return true if peers returns a zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            aptosEndpointArbitrary,
                            nullishAddressArbitrary,
                            nullishAddressArbitrary,
                            async (omniContract, peerEid, peer, probePeer) => {
                                omniContract.contract.peers.mockResolvedValue(peer)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(true)
                            }
                        )
                    )
                })

                it('should return false if peers returns a non-zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            aptosEndpointArbitrary,
                            nullishAddressArbitrary,
                            aptosAddressArbitrary,
                            async (omniContract, peerEid, peer, probePeer) => {
                                fc.pre(!isZero(probePeer))

                                omniContract.contract.peers.mockResolvedValue(peer)

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, probePeer)).resolves.toBe(false)
                            }
                        )
                    )
                })

                it('should return true if peers() returns a matching bytes32', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            omniContractArbitrary,
                            aptosEndpointArbitrary,
                            aptosAddressArbitrary,
                            async (omniContract, peerEid, peer) => {
                                omniContract.contract.peers.mockResolvedValue(makeBytes32(peer))

                                const sdk = new OApp(omniContract)

                                await expect(sdk.hasPeer(peerEid, peer)).resolves.toBe(true)
                                await expect(sdk.hasPeer(peerEid, makeBytes32(peer))).resolves.toBe(true)
                            }
                        )
                    )
                })
            })
        })
    })

    describe('setPeer', () => {
        describe('for EVM', () => {
            it('should encode data for a setPeer call', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        evmEndpointArbitrary,
                        evmAddressArbitrary,
                        async (omniContract, peerEid, peerAddress) => {
                            const sdk = new OApp(omniContract)
                            const encodeFunctionData = omniContract.contract.interface.encodeFunctionData

                            ;(encodeFunctionData as jest.Mock).mockClear()

                            await sdk.setPeer(peerEid, peerAddress)

                            expect(encodeFunctionData).toHaveBeenCalledTimes(1)
                            expect(encodeFunctionData).toHaveBeenCalledWith('setPeer', [
                                peerEid,
                                makeBytes32(peerAddress),
                            ])
                        }
                    )
                )
            })

            it('should return an OmniTransaction', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        evmEndpointArbitrary,
                        evmAddressArbitrary,
                        fc.string(),
                        async (omniContract, peerEid, peerAddress, data) => {
                            const encodeFunctionData = omniContract.contract.interface.encodeFunctionData as jest.Mock
                            encodeFunctionData.mockReturnValue(data)

                            const sdk = new OApp(omniContract)
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

        describe('for Solana', () => {
            it('should encode data for a setPeer call', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        solanaEndpointArbitrary,
                        solanaAddressArbitrary,
                        async (omniContract, peerEid, peerAddress) => {
                            const sdk = new OApp(omniContract)
                            const encodeFunctionData = omniContract.contract.interface.encodeFunctionData

                            ;(encodeFunctionData as jest.Mock).mockClear()

                            await sdk.setPeer(peerEid, peerAddress)

                            expect(encodeFunctionData).toHaveBeenCalledTimes(1)
                            expect(encodeFunctionData).toHaveBeenCalledWith('setPeer', [
                                peerEid,
                                makeBytes32(normalizePeer(peerAddress, peerEid)),
                            ])
                        }
                    )
                )
            })

            it('should return an OmniTransaction', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        solanaEndpointArbitrary,
                        solanaAddressArbitrary,
                        fc.string(),
                        async (omniContract, peerEid, peerAddress, data) => {
                            const encodeFunctionData = omniContract.contract.interface.encodeFunctionData as jest.Mock
                            encodeFunctionData.mockReturnValue(data)

                            const sdk = new OApp(omniContract)
                            const transaction = await sdk.setPeer(peerEid, peerAddress)

                            expect(transaction).toEqual({
                                data,
                                description: `Setting peer for eid ${peerEid} (${formatEid(peerEid)}) to address ${makeBytes32(normalizePeer(peerAddress, peerEid))}`,
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

        describe('for Aptos', () => {
            it('should encode data for a setPeer call', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        aptosEndpointArbitrary,
                        aptosAddressArbitrary,
                        async (omniContract, peerEid, peerAddress) => {
                            const sdk = new OApp(omniContract)
                            const encodeFunctionData = omniContract.contract.interface.encodeFunctionData

                            ;(encodeFunctionData as jest.Mock).mockClear()

                            await sdk.setPeer(peerEid, peerAddress)

                            expect(encodeFunctionData).toHaveBeenCalledTimes(1)
                            expect(encodeFunctionData).toHaveBeenCalledWith('setPeer', [
                                peerEid,
                                makeBytes32(peerAddress),
                            ])
                        }
                    )
                )
            })

            it('should return an OmniTransaction', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        omniContractArbitrary,
                        aptosEndpointArbitrary,
                        aptosAddressArbitrary,
                        fc.string(),
                        async (omniContract, peerEid, peerAddress, data) => {
                            const encodeFunctionData = omniContract.contract.interface.encodeFunctionData as jest.Mock
                            encodeFunctionData.mockReturnValue(data)

                            const sdk = new OApp(omniContract)
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
    })

    describe('getEndpointSDK', () => {
        it('should reject if the call to endpoint() rejects', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, async (omniContract) => {
                    omniContract.contract.endpoint.mockRejectedValue('No you did not')

                    const sdk = new OApp(omniContract)

                    await expect(sdk.getEndpointSDK()).rejects.toThrow(/Failed to get EndpointV2 address for OApp/)
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

                        const sdk = new OApp(omniContract)

                        await expect(sdk.getEndpointSDK()).rejects.toThrow(
                            /EndpointV2 cannot be instantiated: EndpointV2 address has been set to a zero value for OApp/
                        )
                    }
                )
            )
        })

        it('should return an EndpointV2 if the call to endpoint() resolves with a non-zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, evmAddressArbitrary, async (omniContract, endpointAddress) => {
                    fc.pre(!isZero(endpointAddress))

                    omniContract.contract.endpoint.mockResolvedValue(endpointAddress)

                    const sdk = new OApp(omniContract)
                    const endpoint = await sdk.getEndpointSDK()

                    expect(endpoint).toBeInstanceOf(EndpointV2)
                    expect(endpoint.point).toEqual({ eid: sdk.point.eid, address: endpointAddress })
                })
            )
        })
    })
})
