import { addChecksum, makeZeroAddress, Provider } from '@layerzerolabs/devtools-evm'
import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { AddressZero } from '@ethersproject/constants'
import { UlnReadUlnConfig } from '@layerzerolabs/protocol-devtools'
import fc from 'fast-check'
import { channelIdArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { compareBytes32Ascending } from '@layerzerolabs/devtools'
import { UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'
import { UlnRead } from '@/ulnRead'

jest.spyOn(JsonRpcProvider.prototype, 'detectNetwork').mockResolvedValue({ chainId: 1, name: 'mock' })

describe('ulnRead/sdk', () => {
    let provider: Provider, ulnSdk: UlnRead

    const dvnsArbitrary = fc.array(evmAddressArbitrary, { minLength: 2 })

    beforeEach(async () => {
        provider = new JsonRpcProvider()
        ulnSdk = new UlnRead(provider, { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, address: makeZeroAddress() })
    })

    describe('encodeUlnConfig', () => {
        it('should encode and decode the UlnReadUlnConfig', async () => {
            const ulnConfig: UlnReadUlnConfig = {
                executor: AddressZero,
                optionalDVNThreshold: 1,
                optionalDVNs: [AddressZero, AddressZero],
                requiredDVNs: [AddressZero],
            }
            const ulnConfigEncoded = ulnSdk.encodeUlnConfig(ulnConfig)
            expect(ulnConfigEncoded).toMatchSnapshot()

            const ulnConfigDecoded: UlnReadUlnConfig = ulnSdk.decodeUlnConfig(ulnConfigEncoded)

            expect(ulnConfig).toEqual(ulnConfigDecoded)
        })

        it('should sort requiredDVNs and optionalDVNs before encoding', async () => {
            fc.assert(
                fc.property(dvnsArbitrary, (dvns) => {
                    const sortedDvns = [...dvns].sort((a, b) => a.localeCompare(b))
                    const ulnConfigUnsorted: UlnReadUlnConfig = {
                        executor: AddressZero,
                        optionalDVNThreshold: 0,
                        optionalDVNs: dvns,
                        requiredDVNs: dvns,
                    }

                    const ulnConfigSorted: UlnReadUlnConfig = {
                        ...ulnConfigUnsorted,
                        optionalDVNs: sortedDvns,
                        requiredDVNs: sortedDvns,
                    }

                    const ulnConfigEncodedUnsorted = ulnSdk.encodeUlnConfig(ulnConfigUnsorted)
                    const ulnConfigEncodedSorted = ulnSdk.encodeUlnConfig(ulnConfigSorted)
                    expect(ulnConfigEncodedSorted).toBe(ulnConfigEncodedUnsorted)
                }),
                { numRuns: 20 }
            )
        })
    })

    describe('setDefaultUlnConfig', () => {
        it('should sort requiredDVNs and optionalDVNs', async () => {
            await fc.assert(
                fc.asyncProperty(channelIdArbitrary, dvnsArbitrary, async (eid, dvns) => {
                    const sortedDvns = [...dvns].sort((a, b) => a.localeCompare(b))
                    const ulnConfigUnsorted: UlnReadUlnConfig = {
                        executor: AddressZero,
                        optionalDVNThreshold: 0,
                        optionalDVNs: dvns,
                        requiredDVNs: dvns,
                    }

                    const ulnConfigSorted: UlnReadUlnConfig = {
                        ...ulnConfigUnsorted,
                        optionalDVNs: sortedDvns,
                        requiredDVNs: sortedDvns,
                    }

                    // Let's check that both the sorted and the unsorted config produce the same transaction
                    const transactionUnsorted = await ulnSdk.setDefaultUlnConfig(eid, ulnConfigUnsorted)
                    const transactionsSorted = await ulnSdk.setDefaultUlnConfig(eid, ulnConfigSorted)
                    expect(transactionUnsorted).toEqual(transactionsSorted)

                    // And let's check that the encoding call is correct and the DVNs are sorted
                    expect(transactionsSorted.data).toBe(
                        ulnSdk.contract.contract.interface.encodeFunctionData('setDefaultReadLibConfigs', [
                            [
                                {
                                    eid,
                                    config: {
                                        executor: AddressZero,
                                        optionalDVNThreshold: 0,
                                        optionalDVNs: sortedDvns.map(addChecksum),
                                        requiredDVNs: sortedDvns.map(addChecksum),
                                        requiredDVNCount: sortedDvns.length,
                                        optionalDVNCount: sortedDvns.length,
                                    },
                                },
                            ],
                        ])
                    )
                }),
                { numRuns: 20 }
            )
        })

        it('should default the missing attributes', async () => {
            await fc.assert(
                fc.asyncProperty(channelIdArbitrary, dvnsArbitrary, async (eid, dvns) => {
                    const sortedDvns = [...dvns].sort((a, b) => a.localeCompare(b))
                    const ulnUserConfig: UlnReadUlnUserConfig = {
                        requiredDVNs: dvns,
                    }
                    const ulnConfig: UlnReadUlnConfig = {
                        requiredDVNs: dvns,
                        executor: AddressZero,
                        optionalDVNThreshold: 0,
                        optionalDVNs: [],
                    }

                    // Let's check that both the sorted and the unsorted config produce the same transaction
                    const transactionsWithDefaults = await ulnSdk.setDefaultUlnConfig(eid, ulnUserConfig)
                    const transactionsWithFullConfig = await ulnSdk.setDefaultUlnConfig(eid, ulnConfig)
                    expect(transactionsWithDefaults).toEqual(transactionsWithFullConfig)

                    // And let's check that the encoding call is correct and the DVNs are sorted
                    expect(transactionsWithDefaults.data).toBe(
                        ulnSdk.contract.contract.interface.encodeFunctionData('setDefaultReadLibConfigs', [
                            [
                                {
                                    eid,
                                    config: {
                                        executor: ulnConfig.executor,
                                        optionalDVNThreshold: ulnConfig.optionalDVNThreshold,
                                        optionalDVNs: ulnConfig.optionalDVNs,
                                        requiredDVNs: sortedDvns.map(addChecksum),
                                        requiredDVNCount: ulnConfig.requiredDVNs.length,
                                        optionalDVNCount: ulnConfig.optionalDVNs.length,
                                    },
                                },
                            ],
                        ])
                    )
                }),
                { numRuns: 20 }
            )
        })
    })

    describe('hasAppUlnConfig()', () => {
        const ulnConfigArbitrary = dvnsArbitrary.chain((dvns) =>
            fc.record<UlnReadUlnConfig>({
                executor: evmAddressArbitrary,
                optionalDVNThreshold: fc.integer({ min: 0, max: dvns.length }),
                optionalDVNs: fc.constant(dvns),
                requiredDVNs: fc.constant(dvns),
            })
        )

        let getAppUlnConfigSpy: jest.SpyInstance<Promise<UlnReadUlnConfig>, [channelId: number, address: string]>

        beforeEach(() => {
            getAppUlnConfigSpy = jest.spyOn(UlnRead.prototype, 'getAppUlnConfig')
        })

        afterEach(() => {
            getAppUlnConfigSpy.mockRestore()
        })

        it('should return true if the configs are identical', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (channelId, oapp, ulnConfig) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(ulnSdk.hasAppUlnConfig(channelId, oapp, ulnConfig)).resolves.toBeTruthy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return true if config has extra properties', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    fc.object(),
                    async (channelId, oapp, ulnConfig, extra) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...extra,
                                ...ulnConfig,
                            })
                        ).resolves.toBeTruthy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return true if configs with defaults are identical', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    dvnsArbitrary,
                    async (channelId, oapp, dvns) => {
                        const ulnUserConfig: UlnReadUlnUserConfig = {
                            requiredDVNs: dvns,
                        }
                        const ulnConfig: UlnReadUlnConfig = {
                            requiredDVNs: dvns,
                            optionalDVNs: [],
                            optionalDVNThreshold: 0,
                            executor: AddressZero,
                        }

                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(ulnSdk.hasAppUlnConfig(channelId, oapp, ulnUserConfig)).resolves.toBeTruthy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return false if configs with defaults are not identical', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (channelId, oapp, ulnConfig) => {
                        // We only want to test againsts configs that are not
                        // equal to the default config
                        fc.pre(
                            ulnConfig.executor !== AddressZero ||
                                ulnConfig.optionalDVNThreshold !== 0 ||
                                ulnConfig.optionalDVNs.length !== 0
                        )

                        const ulnUserConfig: UlnReadUlnUserConfig = {
                            requiredDVNs: ulnConfig.requiredDVNs,
                        }

                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(ulnSdk.hasAppUlnConfig(channelId, oapp, ulnUserConfig)).resolves.toBeFalsy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return true if the configs are identical except for the dvn casing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (channelId, oapp, ulnConfig) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...ulnConfig,
                                requiredDVNs: ulnConfig.requiredDVNs.map(addChecksum),
                                optionalDVNs: ulnConfig.optionalDVNs.map(addChecksum),
                            })
                        ).resolves.toBeTruthy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return true if the configs are identical except for the dvn sorting and casing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (channelId, oapp, ulnConfig) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...ulnConfig,
                                requiredDVNs: ulnConfig.requiredDVNs.map(addChecksum).sort(compareBytes32Ascending),
                                optionalDVNs: ulnConfig.optionalDVNs.map(addChecksum).sort(compareBytes32Ascending),
                            })
                        ).resolves.toBeTruthy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return false if the confirmations are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    evmAddressArbitrary,
                    async (channelId, oapp, ulnConfig, executor) => {
                        fc.pre(executor !== ulnConfig.executor)

                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...ulnConfig,
                                executor,
                            })
                        ).resolves.toBeFalsy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return false if the optionalDVNThresholds are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    fc.integer(),
                    async (channelId, oapp, ulnConfig, optionalDVNThreshold) => {
                        fc.pre(optionalDVNThreshold !== ulnConfig.optionalDVNThreshold)

                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...ulnConfig,
                                optionalDVNThreshold,
                            })
                        ).resolves.toBeFalsy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return false if the requiredDVNs are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    dvnsArbitrary,
                    async (channelId, oapp, ulnConfig, extraRequiredDVNs) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...ulnConfig,
                                requiredDVNs: [...ulnConfig.requiredDVNs, ...extraRequiredDVNs],
                            })
                        ).resolves.toBeFalsy()
                    }
                ),
                { numRuns: 20 }
            )
        })

        it('should return false if the optionalDVNs are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    channelIdArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    dvnsArbitrary,
                    async (channelId, oapp, ulnConfig, extraOptionalDVNs) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(channelId, oapp, {
                                ...ulnConfig,
                                optionalDVNs: [...ulnConfig.optionalDVNs, ...extraOptionalDVNs],
                            })
                        ).resolves.toBeFalsy()
                    }
                ),
                { numRuns: 20 }
            )
        })
    })
})
