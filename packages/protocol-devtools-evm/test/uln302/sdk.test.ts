import { type OmniContract } from '@layerzerolabs/devtools-evm'
import { Uln302 } from '@/uln302'
import { MainnetV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Contract } from '@ethersproject/contracts'
import { AddressZero } from '@ethersproject/constants'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import artifact from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/uln/uln302/SendUln302.sol/SendUln302.json'
import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'

describe('uln302/sdk', () => {
    let contract: Contract, omniContract: OmniContract, ulnSdk: Uln302

    beforeEach(async () => {
        contract = new Contract(AddressZero, artifact.abi)
        omniContract = { eid: MainnetV2EndpointId.ETHEREUM_V2_MAINNET, contract }
        ulnSdk = new Uln302(omniContract)
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
                fc.property(fc.array(evmAddressArbitrary, { minLength: 2 }), (dvns) => {
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
            const encodeFunctionData = jest.spyOn(contract.interface, 'encodeFunctionData')

            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    fc.array(evmAddressArbitrary, { minLength: 2 }),
                    async (eid, dvns) => {
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
                        expect(encodeFunctionData).toHaveBeenLastCalledWith('setDefaultUlnConfigs', [
                            [
                                {
                                    eid,
                                    config: {
                                        confirmations: '100',
                                        optionalDVNThreshold: 0,
                                        optionalDVNs: sortedDvns,
                                        requiredDVNs: sortedDvns,
                                        requiredDVNCount: sortedDvns.length,
                                        optionalDVNCount: sortedDvns.length,
                                    },
                                },
                            ],
                        ])
                    }
                )
            )
        })
    })
})
