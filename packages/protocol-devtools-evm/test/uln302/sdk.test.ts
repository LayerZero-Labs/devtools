import { addChecksum, type OmniContract } from '@layerzerolabs/devtools-evm'
import { Uln302 } from '@/uln302'
import { EndpointId, MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Contract } from '@ethersproject/contracts'
import { AddressZero } from '@ethersproject/constants'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import artifact from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/uln/uln302/SendUln302.sol/SendUln302.json'
import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { compareBytes32Ascending } from '@layerzerolabs/devtools'

describe('uln302/sdk', () => {
    let contract: Contract, omniContract: OmniContract, ulnSdk: Uln302

    const dvnsArbitrary = fc.array(evmAddressArbitrary, { minLength: 2 })

    beforeEach(async () => {
        contract = new Contract(AddressZero, artifact.abi)
        omniContract = { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, contract }
        ulnSdk = new Uln302(omniContract)
    })

    afterEach(() => {
        contract = undefined!
        omniContract = undefined!
        ulnSdk = undefined!
    })

    describe('encodeExecutorConfig', () => {
        it('should encode and decode the Uln302ExecutorConfig', async () => {
            const executorConfig: Uln302ExecutorConfig = { executor: AddressZero, maxMessageSize: 100 }
            const executorConfigEncoded = ulnSdk.encodeExecutorConfig(executorConfig)
            expect(executorConfigEncoded).toMatchSnapshot()

            const executorConfigDecoded: Uln302ExecutorConfig = ulnSdk.decodeExecutorConfig(executorConfigEncoded)
            expect(executorConfig).toEqual(executorConfigDecoded)
        })
    })

    describe('encodeUlnConfig', () => {
        it('should encode and decode the Uln302UlnConfig', async () => {
            const ulnConfig: Uln302UlnConfig = {
                confirmations: BigInt(100),
                optionalDVNThreshold: 1,
                optionalDVNs: [AddressZero, AddressZero],
                requiredDVNs: [AddressZero],
            }
            const ulnConfigEncoded = ulnSdk.encodeUlnConfig(ulnConfig)
            expect(ulnConfigEncoded).toMatchSnapshot()

            const ulnConfigDecoded: Uln302UlnConfig = ulnSdk.decodeUlnConfig(ulnConfigEncoded)

            expect(ulnConfig).toEqual(ulnConfigDecoded)
        })

        it('should sort requiredDVNs and optionalDVNs before encoding', async () => {
            fc.assert(
                fc.property(dvnsArbitrary, (dvns) => {
                    const sortedDvns = [...dvns].sort((a, b) => a.localeCompare(b))
                    const ulnConfigUnsorted: Uln302UlnConfig = {
                        confirmations: BigInt(100),
                        optionalDVNThreshold: 0,
                        optionalDVNs: dvns,
                        requiredDVNs: dvns,
                    }

                    const ulnConfigSorted: Uln302UlnConfig = {
                        ...ulnConfigUnsorted,
                        optionalDVNs: sortedDvns,
                        requiredDVNs: sortedDvns,
                    }

                    const ulnConfigEncodedUnsorted = ulnSdk.encodeUlnConfig(ulnConfigUnsorted)
                    const ulnConfigEncodedSorted = ulnSdk.encodeUlnConfig(ulnConfigSorted)
                    expect(ulnConfigEncodedSorted).toBe(ulnConfigEncodedUnsorted)
                })
            )
        })
    })

    describe('setDefaultUlnConfig', () => {
        it('should sort requiredDVNs and optionalDVNs', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, dvnsArbitrary, async (eid, dvns) => {
                    const sortedDvns = [...dvns].sort((a, b) => a.localeCompare(b))
                    const ulnConfigUnsorted: Uln302UlnConfig = {
                        confirmations: BigInt(100),
                        optionalDVNThreshold: 0,
                        optionalDVNs: dvns,
                        requiredDVNs: dvns,
                    }

                    const ulnConfigSorted: Uln302UlnConfig = {
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
                        contract.interface.encodeFunctionData('setDefaultUlnConfigs', [
                            [
                                {
                                    eid,
                                    config: {
                                        confirmations: BigInt(100),
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
                })
            )
        })
    })

    describe('hasAppUlnConfig()', () => {
        const ulnConfigArbitrary = dvnsArbitrary.chain((dvns) =>
            fc.record<Uln302UlnConfig>({
                confirmations: fc.bigInt(),
                optionalDVNThreshold: fc.integer({ min: 0, max: dvns.length }),
                optionalDVNs: fc.constant(dvns),
                requiredDVNs: fc.constant(dvns),
            })
        )

        let getAppUlnConfigSpy: jest.SpyInstance<Promise<Uln302UlnConfig>, [eid: EndpointId, address: string]>

        beforeEach(() => {
            getAppUlnConfigSpy = jest.spyOn(Uln302.prototype, 'getAppUlnConfig')
        })

        afterEach(() => {
            getAppUlnConfigSpy.mockRestore()
        })

        it('should return true if the configs are identical', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (eid, oapp, ulnConfig) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(ulnSdk.hasAppUlnConfig(eid, oapp, ulnConfig)).resolves.toBeTruthy()
                    }
                )
            )
        })

        it('should return true if config has extra properties', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    fc.object(),
                    async (eid, oapp, ulnConfig, extra) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...extra,
                                ...ulnConfig,
                            })
                        ).resolves.toBeTruthy()
                    }
                )
            )
        })

        it('should return true if the configs are identical except for the dvn casing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (eid, oapp, ulnConfig) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...ulnConfig,
                                requiredDVNs: ulnConfig.requiredDVNs.map(addChecksum),
                                optionalDVNs: ulnConfig.optionalDVNs.map(addChecksum),
                            })
                        ).resolves.toBeTruthy()
                    }
                )
            )
        })

        it('should return true if the configs are identical except for the dvn sorting and casing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    async (eid, oapp, ulnConfig) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...ulnConfig,
                                requiredDVNs: ulnConfig.requiredDVNs.map(addChecksum).sort(compareBytes32Ascending),
                                optionalDVNs: ulnConfig.optionalDVNs.map(addChecksum).sort(compareBytes32Ascending),
                            })
                        ).resolves.toBeTruthy()
                    }
                )
            )
        })

        it('should return false if the confirmations are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    fc.bigInt(),
                    async (eid, oapp, ulnConfig, confirmations) => {
                        fc.pre(confirmations !== ulnConfig.confirmations)

                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...ulnConfig,
                                confirmations,
                            })
                        ).resolves.toBeFalsy()
                    }
                )
            )
        })

        it('should return false if the optionalDVNThresholds are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    fc.integer(),
                    async (eid, oapp, ulnConfig, optionalDVNThreshold) => {
                        fc.pre(optionalDVNThreshold !== ulnConfig.optionalDVNThreshold)

                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...ulnConfig,
                                optionalDVNThreshold,
                            })
                        ).resolves.toBeFalsy()
                    }
                )
            )
        })

        it('should return false if the requiredDVNs are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    dvnsArbitrary,
                    async (eid, oapp, ulnConfig, extraRequiredDVNs) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...ulnConfig,
                                requiredDVNs: [...ulnConfig.requiredDVNs, ...extraRequiredDVNs],
                            })
                        ).resolves.toBeFalsy()
                    }
                )
            )
        })

        it('should return false if the optionalDVNs are different', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    ulnConfigArbitrary,
                    dvnsArbitrary,
                    async (eid, oapp, ulnConfig, extraOptionalDVNs) => {
                        getAppUlnConfigSpy.mockReset()
                        getAppUlnConfigSpy.mockResolvedValue(ulnConfig)

                        await expect(
                            ulnSdk.hasAppUlnConfig(eid, oapp, {
                                ...ulnConfig,
                                optionalDVNs: [...ulnConfig.optionalDVNs, ...extraOptionalDVNs],
                            })
                        ).resolves.toBeFalsy()
                    }
                )
            )
        })
    })

    describe('hasAppExecutorConfig()', () => {
        const executorConfigArbitrary = fc.record<Uln302ExecutorConfig>({
            executor: evmAddressArbitrary,
            maxMessageSize: fc.integer({ min: 0 }),
        })

        let getAppExecutorConfigSpy: jest.SpyInstance<Promise<Uln302ExecutorConfig>, [eid: EndpointId, address: string]>

        beforeEach(() => {
            getAppExecutorConfigSpy = jest.spyOn(Uln302.prototype, 'getAppExecutorConfig')
        })

        afterEach(() => {
            getAppExecutorConfigSpy.mockRestore()
        })

        it('should return true if the configs are identical', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    executorConfigArbitrary,
                    async (eid, oapp, executorConfig) => {
                        getAppExecutorConfigSpy.mockReset()
                        getAppExecutorConfigSpy.mockResolvedValue(executorConfig)

                        await expect(ulnSdk.hasAppExecutorConfig(eid, oapp, executorConfig)).resolves.toBeTruthy()
                    }
                )
            )
        })

        it('should return true if the configs are identical except for the executor casing', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    executorConfigArbitrary,
                    async (eid, oapp, executorConfig) => {
                        getAppExecutorConfigSpy.mockReset()
                        getAppExecutorConfigSpy.mockResolvedValue(executorConfig)

                        await expect(
                            ulnSdk.hasAppExecutorConfig(eid, oapp, {
                                ...executorConfig,
                                executor: addChecksum(executorConfig.executor),
                            })
                        ).resolves.toBeTruthy()
                    }
                )
            )
        })

        it('should return true if config has extra properties', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    evmAddressArbitrary,
                    executorConfigArbitrary,
                    fc.object(),
                    async (eid, oapp, executorConfig, extra) => {
                        getAppExecutorConfigSpy.mockReset()
                        getAppExecutorConfigSpy.mockResolvedValue(executorConfig)

                        await expect(
                            ulnSdk.hasAppExecutorConfig(eid, oapp, {
                                ...extra,
                                ...executorConfig,
                            })
                        ).resolves.toBeTruthy()
                    }
                )
            )
        })
    })
})
