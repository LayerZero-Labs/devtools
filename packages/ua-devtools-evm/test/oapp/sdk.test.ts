import fc from 'fast-check'
import {
    aptosAddressArbitrary,
    aptosEndpointArbitrary,
    endpointArbitrary,
    evmAddressArbitrary,
    evmEndpointArbitrary,
    pointArbitrary,
    solanaAddressArbitrary,
    solanaEndpointArbitrary,
} from '@layerzerolabs/test-devtools'
import { OApp } from '@/oapp/sdk'
import { addChecksum, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { areBytes32Equal, isZero, makeBytes32, normalizePeer } from '@layerzerolabs/devtools'
import { formatEid } from '@layerzerolabs/devtools'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-evm'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

jest.spyOn(JsonRpcProvider.prototype, 'detectNetwork').mockResolvedValue({ chainId: 1, name: 'mock' })

describe('oapp/sdk', () => {
    const nullishAddressArbitrary = fc.constantFrom(null, undefined, makeZeroAddress(), makeBytes32(makeZeroAddress()))

    const evmPointArbitrary = pointArbitrary.filter(({ eid }) => endpointIdToChainType(eid) === ChainType.EVM)

    describe('getPeer', () => {
        it('should call peers on the contract', async () => {
            await fc.assert(
                fc.asyncProperty(evmPointArbitrary, endpointArbitrary, async (point, peerEid) => {
                    const provider = new JsonRpcProvider()

                    const sdk = new OApp(provider, point)
                    const peer = normalizePeer(undefined, peerEid)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                    )

                    await sdk.getPeer(peerEid)

                    expect(provider.call).toHaveBeenCalledTimes(1)
                    expect(provider.call).toHaveBeenCalledWith(
                        {
                            data: sdk.contract.contract.interface.encodeFunctionData('peers', [peerEid]),
                            to: addChecksum(point.address),
                        },
                        undefined
                    )
                })
            )
        })

        describe('for EVM', () => {
            it('should return undefined if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        evmEndpointArbitrary,
                        nullishAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const peer = normalizePeer(peerAddress, peerEid)

                            jest.spyOn(provider, 'call').mockResolvedValue(
                                sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                            )

                            await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                        }
                    )
                )
            })

            it('should return an address if peers() returns a non-null bytes', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        evmEndpointArbitrary,
                        evmAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            fc.pre(!isZero(peerAddress))

                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const peer = normalizePeer(peerAddress, peerEid)

                            jest.spyOn(provider, 'call').mockResolvedValue(
                                sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                            )

                            await expect(sdk.getPeer(peerEid)).resolves.toBe(peerAddress)
                        }
                    )
                )
            })
        })

        describe('for Solana', () => {
            it('should return undefined if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        solanaEndpointArbitrary,
                        nullishAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const peer = normalizePeer(peerAddress, point.eid)

                            jest.spyOn(provider, 'call').mockResolvedValue(
                                sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                            )

                            await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                        }
                    )
                )
            })

            it('should return an address if peers() returns a non-null bytes', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        solanaEndpointArbitrary,
                        solanaAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            // For Solana we need to take the native address format and turn it into EVM bytes32
                            //
                            // We do this by normalizing the value into a UInt8Array,
                            // then denormalizing it using an EVM eid
                            const peer = normalizePeer(peerAddress, peerEid)

                            fc.pre(!isZero(peer))

                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)

                            jest.spyOn(provider, 'call').mockResolvedValue(
                                sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                            )

                            await expect(sdk.getPeer(peerEid)).resolves.toBe(peerAddress)
                        }
                    )
                )
            })
        })

        describe('for Aptos', () => {
            it('should return undefined if peers() returns a zero address, null or undefined', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        aptosEndpointArbitrary,
                        nullishAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const peer = normalizePeer(peerAddress, point.eid)

                            jest.spyOn(provider, 'call').mockResolvedValue(
                                sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                            )

                            await expect(sdk.getPeer(peerEid)).resolves.toBeUndefined()
                        }
                    )
                )
            })

            it('should return an address if peers() returns a non-null bytes', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        aptosEndpointArbitrary,
                        aptosAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const peer = normalizePeer(peerAddress, point.eid)

                            fc.pre(!isZero(peer))

                            jest.spyOn(provider, 'call').mockResolvedValue(
                                sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                            )

                            await expect(sdk.getPeer(peerEid)).resolves.toBe(peerAddress)
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
                            evmPointArbitrary,
                            evmEndpointArbitrary,
                            nullishAddressArbitrary,
                            nullishAddressArbitrary,
                            async (point, peerEid, peerAddress, probePeerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, point.eid)

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, probePeerAddress)).resolves.toBe(true)
                            }
                        )
                    )
                })

                it('should return false if peers returns a non-zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            evmEndpointArbitrary,
                            nullishAddressArbitrary,
                            evmAddressArbitrary,
                            async (point, peerEid, peerAddress, probePeerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, point.eid)
                                const probePeer = normalizePeer(probePeerAddress, point.eid)

                                fc.pre(!isZero(probePeer))

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, probePeerAddress)).resolves.toBe(false)
                            }
                        )
                    )
                })

                it('should return true if peers() returns a matching bytes32', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            evmEndpointArbitrary,
                            evmAddressArbitrary,
                            async (point, peerEid, peerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, point.eid)

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, peerAddress)).resolves.toBe(true)
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
                            evmPointArbitrary,
                            solanaEndpointArbitrary,
                            nullishAddressArbitrary,
                            async (point, peerEid, peerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, point.eid)

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, undefined)).resolves.toBe(true)
                            }
                        )
                    )
                })

                it('should return false if peers returns a different value', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            solanaEndpointArbitrary,
                            solanaAddressArbitrary,
                            solanaAddressArbitrary,
                            async (point, peerEid, peerAddress, probePeerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, peerEid)
                                const probePeer = normalizePeer(probePeerAddress, peerEid)

                                fc.pre(!areBytes32Equal(peer, probePeer))

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, probePeerAddress)).resolves.toBe(false)
                            }
                        )
                    )
                })

                it('should return true if peers() returns a matching value', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            solanaEndpointArbitrary,
                            solanaAddressArbitrary,
                            async (point, peerEid, peerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, peerEid)

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, peerAddress)).resolves.toBe(true)
                            }
                        )
                    )
                })
            })

            describe('for Aptos', () => {
                it('should return true if peers returns a zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            aptosEndpointArbitrary,
                            nullishAddressArbitrary,
                            nullishAddressArbitrary,
                            async (point, peerEid, peerAddress, probePeerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, point.eid)

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, probePeerAddress)).resolves.toBe(true)
                            }
                        )
                    )
                })

                it('should return false if peers returns a non-zero address', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            aptosEndpointArbitrary,
                            nullishAddressArbitrary,
                            aptosAddressArbitrary,
                            async (point, peerEid, peerAddress, probePeerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, peerEid)
                                const probePeer = normalizePeer(probePeerAddress, peerEid)

                                fc.pre(!isZero(probePeer))

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, probePeerAddress)).resolves.toBe(false)
                            }
                        )
                    )
                })

                it('should return true if peers() returns a matching bytes32', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            evmPointArbitrary,
                            aptosEndpointArbitrary,
                            aptosAddressArbitrary,
                            async (point, peerEid, peerAddress) => {
                                const provider = new JsonRpcProvider()
                                const sdk = new OApp(provider, point)
                                const peer = normalizePeer(peerAddress, peerEid)

                                jest.spyOn(provider, 'call').mockResolvedValue(
                                    sdk.contract.contract.interface.encodeFunctionResult('peers', [peer])
                                )

                                await expect(sdk.hasPeer(peerEid, peerAddress)).resolves.toBe(true)
                                await expect(sdk.hasPeer(peerEid, makeBytes32(peerAddress))).resolves.toBe(true)
                            }
                        )
                    )
                })
            })
        })
    })

    describe('setPeer', () => {
        describe('for EVM', () => {
            it('should return an OmniTransaction', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        evmEndpointArbitrary,
                        evmAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const transaction = await sdk.setPeer(peerEid, peerAddress)

                            expect(transaction).toEqual({
                                data: sdk.contract.contract.interface.encodeFunctionData('setPeer', [
                                    peerEid,
                                    makeBytes32(peerAddress),
                                ]),
                                description: `Setting peer for eid ${peerEid} (${formatEid(peerEid)}) to address ${makeBytes32(peerAddress)}`,
                                point,
                            })
                        }
                    )
                )
            })
        })

        describe('for Solana', () => {
            it('should return an OmniTransaction', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        solanaEndpointArbitrary,
                        solanaAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const transaction = await sdk.setPeer(peerEid, peerAddress)

                            expect(transaction).toEqual({
                                data: sdk.contract.contract.interface.encodeFunctionData('setPeer', [
                                    peerEid,
                                    makeBytes32(normalizePeer(peerAddress, peerEid)),
                                ]),
                                description: `Setting peer for eid ${peerEid} (${formatEid(peerEid)}) to address ${makeBytes32(normalizePeer(peerAddress, peerEid))}`,
                                point,
                            })
                        }
                    )
                )
            })
        })

        describe('for Aptos', () => {
            it('should return an OmniTransaction', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmPointArbitrary,
                        aptosEndpointArbitrary,
                        aptosAddressArbitrary,
                        async (point, peerEid, peerAddress) => {
                            const provider = new JsonRpcProvider()
                            const sdk = new OApp(provider, point)
                            const transaction = await sdk.setPeer(peerEid, peerAddress)

                            expect(transaction).toEqual({
                                data: sdk.contract.contract.interface.encodeFunctionData('setPeer', [
                                    peerEid,
                                    makeBytes32(normalizePeer(peerAddress, peerEid)),
                                ]),
                                description: `Setting peer for eid ${peerEid} (${formatEid(peerEid)}) to address ${makeBytes32(peerAddress)}`,
                                point,
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
                fc.asyncProperty(evmPointArbitrary, async (point) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new OApp(provider, point)

                    jest.spyOn(provider, 'call').mockRejectedValue('No you did not')

                    await expect(sdk.getEndpointSDK()).rejects.toThrow(/Failed to get EndpointV2 address for OApp/)
                })
            )
        })

        it('should reject if the call to endpoint() resolves with a zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(evmPointArbitrary, async (point) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new OApp(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('endpoint', [makeZeroAddress()])
                    )

                    await expect(sdk.getEndpointSDK()).rejects.toThrow(
                        /EndpointV2 cannot be instantiated: EndpointV2 address has been set to a zero value for OApp/
                    )
                })
            )
        })

        it('should return an EndpointV2 if the call to endpoint() resolves with a non-zeroish address', async () => {
            await fc.assert(
                fc.asyncProperty(evmPointArbitrary, evmAddressArbitrary, async (point, endpointAddress) => {
                    fc.pre(!isZero(endpointAddress))

                    const provider = new JsonRpcProvider()
                    const sdk = new OApp(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('endpoint', [endpointAddress])
                    )

                    const endpoint = await sdk.getEndpointSDK()

                    expect(endpoint).toBeInstanceOf(EndpointV2)
                    expect(endpoint.point).toEqual({ eid: sdk.point.eid, address: addChecksum(endpointAddress) })
                })
            )
        })
    })
})
