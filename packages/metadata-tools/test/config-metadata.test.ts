import {
    DVNsToAddresses,
    resolveExecutor,
    generateConnectionsConfig,
    translatePathwayToConfig,
} from '@/config-metadata'
import { IMetadataDvns, IMetadataExecutors, IMetadata, TwoWayConfig } from '@/types'

import fujiMetadata from './data/fuji.json'
import polygonMainnetMetadata from './data/polygon-mainnet.json'
import solanaMainnetMetadata from './data/solana-mainnet.json'
import solanaTestnetMetadata from './data/solana-testnet.json'
import { BLOCKED_MESSAGE_LIB_INDICATOR, NIL_DVN_COUNT } from '@/constants'

describe('config-metadata', () => {
    const metadata: IMetadata = {
        fuji: fujiMetadata,
        solana: solanaMainnetMetadata,
        polygon: polygonMainnetMetadata,
        'solana-testnet': solanaTestnetMetadata,
    }

    describe('generateConnectionsConfig', () => {
        const metadata: IMetadata = {
            fuji: fujiMetadata,
            solana: solanaMainnetMetadata,
            polygon: polygonMainnetMetadata,
            'solana-testnet': solanaTestnetMetadata,
        }

        it('should allow for call without custom params', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            // This array is your TwoWayConfig[]
            const pathways: TwoWayConfig[] = [
                [avalancheContract, solanaContract, [['LayerZero Labs'], []], [1, 1], [undefined, undefined]],
            ]

            const config = await generateConnectionsConfig(pathways)
            expect(config).toMatchSnapshot()
        })

        it('should generate the connections config for a given set of pathways', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            const pathways: TwoWayConfig[] = [
                [avalancheContract, solanaContract, [['LayerZero Labs'], []], [1, 1], [undefined, undefined]],
            ]

            const mockFetchMetadata = async () => metadata

            const config = await generateConnectionsConfig(pathways, { fetchMetadata: mockFetchMetadata })
            expect(config).toMatchSnapshot()
        })
        it('should allow for custom DVNs in the metadata', async () => {
            // extend the Solana DVNs with custom DVN(s)
            const solanaTestnetDVNsWithCustom: IMetadataDvns = {
                ...metadata['solana-testnet']!.dvns,
                '29EKzmCscUg8mf4f5uskwMqvu2SXM8hKF1gWi1cCBoKT': {
                    version: 2,
                    canonicalName: 'SuperCustomDVN',
                    id: 'super-custom-dvn',
                },
            }
            // extend the Fuji DVNs with custom DVN
            const fujiDVNsWithCustom: IMetadataDvns = {
                ...metadata.fuji!.dvns,
                '0x9f0e79aeb198750f963b6f30b99d87c6ee5a0467': {
                    version: 2,
                    canonicalName: 'SuperCustomDVN',
                    id: 'super-custom-dvn',
                },
            }
            const customFetchMetadata = async (): Promise<IMetadata> => {
                return {
                    ...metadata,
                    'solana-testnet': {
                        ...metadata['solana-testnet']!,
                        dvns: solanaTestnetDVNsWithCustom,
                    },
                    fuji: {
                        ...metadata.fuji!,
                        dvns: fujiDVNsWithCustom,
                    },
                }
            }

            const avalancheContract = { eid: 40106, contractName: 'MyOFT' }
            const solanaContract = { eid: 40168, address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy' }

            // A pathway referencing the newly injected "P2P" DVN
            const pathways: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [
                        ['SuperCustomDVN'], // required DVNs
                        [], // optional DVNs + threshold
                    ],
                    [1, 1],
                    [undefined, undefined],
                ],
            ]

            // Generate config using our custom fetchMetadata
            const config = await generateConnectionsConfig(pathways, { fetchMetadata: customFetchMetadata })
            expect(config).toMatchSnapshot()
        })

        it('should allow for custom executor in the metadata', async () => {
            // extend the Fuji metadata with custom executor
            const fujiExecutorsWithCustom: IMetadataExecutors = {
                '0x1234567890abcdef1234567890abcdef12345678': {
                    version: 2,
                    canonicalName: 'CustomExecutor',
                    id: 'custom-executor',
                },
            }

            const customFetchMetadata = async (): Promise<IMetadata> => {
                return {
                    ...metadata,
                    fuji: {
                        ...metadata.fuji!,
                        executors: fujiExecutorsWithCustom,
                    },
                }
            }

            const avalancheContract = { eid: 40106, contractName: 'MyOFT' }
            const solanaContract = { eid: 40168, address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy' }

            // A pathway using the custom executor
            const pathways: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [['LayerZero Labs'], []],
                    [1, 1],
                    [undefined, undefined],
                    'CustomExecutor', // Use custom executor
                ],
            ]

            const config = await generateConnectionsConfig(pathways, { fetchMetadata: customFetchMetadata })

            // Check that the custom executor address is used in send configs
            expect(config[0]?.config?.sendConfig?.executorConfig?.executor).toBe(
                '0x1234567890abcdef1234567890abcdef12345678'
            )
            // Solana doesn't have custom executor defined, so it uses the name as-is (backward compatibility)
            expect(config[1]?.config?.sendConfig?.executorConfig?.executor).toBe('CustomExecutor')
        })

        it('should use custom executor for both directions when specified', async () => {
            // extend both Fuji and Solana metadata with custom executors
            const customFetchMetadata = async (): Promise<IMetadata> => {
                return {
                    ...metadata,
                    fuji: {
                        ...metadata.fuji!,
                        executors: {
                            '0xaaaa567890abcdef1234567890abcdef12345678': {
                                version: 2,
                                canonicalName: 'FujiCustomExecutor',
                                id: 'fuji-custom-executor',
                            },
                        },
                    },
                    'solana-testnet': {
                        ...metadata['solana-testnet']!,
                        executors: {
                            SoLaNaExEcUtOrAdDrEsSfOrTeStInGpUrPoSeS1234: {
                                version: 2,
                                canonicalName: 'SolanaCustomExecutor',
                                id: 'solana-custom-executor',
                            },
                        },
                    },
                }
            }

            const avalancheContract = { eid: 40106, contractName: 'MyOFT' }
            const solanaContract = { eid: 40168, address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy' }

            // Test with FujiCustomExecutor
            const pathwaysWithFujiExecutor: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [['LayerZero Labs'], []],
                    [1, 1],
                    [undefined, undefined],
                    'FujiCustomExecutor',
                ],
            ]

            const configWithFujiExecutor = await generateConnectionsConfig(pathwaysWithFujiExecutor, {
                fetchMetadata: customFetchMetadata,
            })

            // Both directions should use the custom executor from their respective chains
            expect(configWithFujiExecutor[0]?.config?.sendConfig?.executorConfig?.executor).toBe(
                '0xaaaa567890abcdef1234567890abcdef12345678'
            )
            // Solana doesn't have FujiCustomExecutor defined, so it uses the name as-is (backward compatibility)
            expect(configWithFujiExecutor[1]?.config?.sendConfig?.executorConfig?.executor).toBe('FujiCustomExecutor')
        })

        it('should resolve executor name based on each chain metadata', async () => {
            // Define the same executor name with different addresses on each chain
            const customFetchMetadata = async (): Promise<IMetadata> => {
                return {
                    ...metadata,
                    fuji: {
                        ...metadata.fuji!,
                        executors: {
                            '0xfuji567890abcdef1234567890abcdef12345678': {
                                version: 2,
                                canonicalName: 'MyCustomExecutor',
                                id: 'my-custom-executor-fuji',
                            },
                        },
                    },
                    'solana-testnet': {
                        ...metadata['solana-testnet']!,
                        executors: {
                            SoLaNaExEcUtOrAdDrEsSfOrMyCustomExecutor123: {
                                version: 2,
                                canonicalName: 'MyCustomExecutor',
                                id: 'my-custom-executor-solana',
                            },
                        },
                    },
                }
            }

            const avalancheContract = { eid: 40106, contractName: 'MyOFT' }
            const solanaContract = { eid: 40168, address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy' }

            const pathways: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [['LayerZero Labs'], []],
                    [1, 1],
                    [undefined, undefined],
                    'MyCustomExecutor', // Same name resolves to different addresses on each chain
                ],
            ]

            const config = await generateConnectionsConfig(pathways, { fetchMetadata: customFetchMetadata })

            // Each chain resolves the executor name to its own address
            expect(config[0]?.config?.sendConfig?.executorConfig?.executor).toBe(
                '0xfuji567890abcdef1234567890abcdef12345678'
            )
            expect(config[1]?.config?.sendConfig?.executorConfig?.executor).toBe(
                'SoLaNaExEcUtOrAdDrEsSfOrMyCustomExecutor123'
            )
        })

        it('uses NIL_DVN_COUNT when no required DVNs are provided', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            const pathways: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [[], [['LayerZero Labs', 'P2P'], 1]],
                    [1, 1],
                    [undefined, undefined],
                ],
            ]

            const config = await generateConnectionsConfig(pathways)
            expect(config).toMatchSnapshot()

            expect(config[0]?.config?.sendConfig?.ulnConfig?.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(config[0]?.config?.sendConfig?.ulnConfig?.optionalDVNThreshold).toBe(1)
            expect(config[0]?.config?.receiveConfig?.ulnConfig?.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(config[0]?.config?.receiveConfig?.ulnConfig?.optionalDVNThreshold).toBe(1)
            expect(config[1]?.config?.sendConfig?.ulnConfig?.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(config[1]?.config?.sendConfig?.ulnConfig?.optionalDVNThreshold).toBe(1)
            expect(config[1]?.config?.receiveConfig?.ulnConfig?.requiredDVNCount).toBe(NIL_DVN_COUNT)
            expect(config[1]?.config?.receiveConfig?.ulnConfig?.optionalDVNThreshold).toBe(1)
        })

        it('supports passing no required DVNs and no optional DVNs', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            const pathways: TwoWayConfig[] = [
                [avalancheContract, solanaContract, [[], []], [1, 1], [undefined, undefined]],
            ]

            const config = await generateConnectionsConfig(pathways)
            expect(config).toMatchSnapshot()
        })

        it('supports using block send library for A to B', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            const pathways: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [['LayerZero Labs'], []],
                    [[1, BLOCKED_MESSAGE_LIB_INDICATOR], 1],
                    [undefined, undefined],
                ],
            ]

            const config = await generateConnectionsConfig(pathways)
            expect(config).toMatchSnapshot()

            expect(config[0]?.config?.sendLibrary).toBe(
                fujiMetadata.deployments?.find((d) => d.version === 2)?.blockedMessageLib?.address
            )
            expect(config[1]?.config?.receiveLibraryConfig?.receiveLibrary).toBe(
                solanaTestnetMetadata.deployments?.find((d) => d.version === 2)?.blocked_messagelib?.address
            )
        })

        it('supports using block send library for both A to B and B to A', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            const pathways: TwoWayConfig[] = [
                [
                    avalancheContract,
                    solanaContract,
                    [['LayerZero Labs'], []],
                    [
                        [1, BLOCKED_MESSAGE_LIB_INDICATOR],
                        [1, BLOCKED_MESSAGE_LIB_INDICATOR],
                    ],
                    [undefined, undefined],
                ],
            ]

            const config = await generateConnectionsConfig(pathways)
            expect(config).toMatchSnapshot()

            expect(config[0]?.config?.sendLibrary).toBe(
                fujiMetadata.deployments?.find((d) => d.version === 2)?.blockedMessageLib?.address
            )
            expect(config[0]?.config?.receiveLibraryConfig?.receiveLibrary).toBe(
                fujiMetadata.deployments?.find((d) => d.version === 2)?.blockedMessageLib?.address
            )
            expect(config[1]?.config?.sendLibrary).toBe(
                solanaTestnetMetadata.deployments?.find((d) => d.version === 2)?.blocked_messagelib?.address
            )
            expect(config[1]?.config?.receiveLibraryConfig?.receiveLibrary).toBe(
                solanaTestnetMetadata.deployments?.find((d) => d.version === 2)?.blocked_messagelib?.address
            )
        })
    })

    describe('translatePathwayToConfig', () => {
        it('should be able to translate a pathway to a config', async () => {
            const avalancheContract = {
                eid: 40106,
                contractName: 'MyOFT',
            }

            const solanaContract = {
                eid: 40168,
                address: 'HBTWw2VKNLuDBjg9e5dArxo5axJRX8csCEBcCo3CFdAy',
            }

            const translatedConfig = await translatePathwayToConfig(
                [avalancheContract, solanaContract, [['LayerZero Labs'], []], [1, 1], [undefined, undefined]],
                metadata
            )

            expect(translatedConfig).toMatchSnapshot()
        })
    })

    describe('DVNsToAddresses', () => {
        it('returns an empty array if no DVNs are provided', () => {
            expect(DVNsToAddresses([], 'fuji', metadata)).toStrictEqual([])
        })

        it('should correctly parse DVN addresses', () => {
            expect(DVNsToAddresses(['LayerZero Labs'], 'fuji', metadata)).toStrictEqual([
                '0x9f0e79aeb198750f963b6f30b99d87c6ee5a0467',
            ])
        })

        it('sorts the EVM addresses', () => {
            expect(
                DVNsToAddresses(['LayerZero Labs', 'Nethermind', 'Google', 'Gitcoin'], 'fuji', metadata)
            ).toStrictEqual([
                '0x071fbf35b35d48afc3edf84f0397980c25531560',
                '0x7883f83ea40a56137a63baf93bfee5b9b8c1c447',
                '0x9f0e79aeb198750f963b6f30b99d87c6ee5a0467',
                '0xa4652582077afc447ea7c9e984d656ee4963fe95',
            ])
        })

        it('sorts the Solana addresses', () => {
            expect(
                DVNsToAddresses(['LayerZero Labs', 'Nethermind', 'Paxos', 'Horizen', 'Google'], 'solana', metadata)
            ).toStrictEqual([
                '4HxXbLv37XrivKukEbofybpHr7C8HUGJzd4B5T9USpGh',
                '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb',
                'F7gu9kLcpn4bSTZn183mhn2RXUuMy7zckdxJZdUjuALw',
                'GPjyWr8vCotGuFubDpTxDxy9Vj1ZeEN4F2dwRmFiaGab',
                'HR9NQKK1ynW9NzgdM37dU5CBtqRHTukmbMKS7qkwSkHX',
            ])
        })

        it('should not support hex string addresses', () => {
            expect(() =>
                DVNsToAddresses(['0xa4652582077afc447ea7c9e984d656ee4963fe95', 'LayerZero Labs'], 'fuji', metadata)
            ).toThrow(
                `Can't find DVN: "0xa4652582077afc447ea7c9e984d656ee4963fe95" on chainKey: "fuji". Double check you're using valid DVN canonical name (not an address).`
            )
        })

        it('should not support Solana addresses', () => {
            expect(() => DVNsToAddresses(['4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb'], 'solana', metadata)).toThrow(
                `Can't find DVN: "4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb" on chainKey: "solana". Double check you're using valid DVN canonical name (not an address).`
            )
        })

        it('should throw error for invalid chain key', () => {
            expect(() => DVNsToAddresses(['LayerZero Labs'], 'invalid_chain', metadata)).toThrow(
                `Can't find DVNs for chainKey: "invalid_chain".`
            )
        })

        it('should throw error for non-existent DVN name', () => {
            expect(() => DVNsToAddresses(['Non Existent DVN'], 'fuji', metadata)).toThrow(
                `Can't find DVN: "Non Existent DVN" on chainKey: "fuji". Double check you're using valid DVN canonical name (not an address).`
            )
        })

        it('should be case sensitive for DVN names', () => {
            expect(() => DVNsToAddresses(['layerzero labs'], 'fuji', metadata)).toThrow(
                `Can't find DVN: "layerzero labs" on chainKey: "fuji". Double check you're using valid DVN canonical name (not an address).`
            )
        })

        it('should handle duplicate DVN names', () => {
            expect(() => DVNsToAddresses(['LayerZero Labs', 'LayerZero Labs'], 'fuji', metadata)).toThrow(
                `Duplicate DVN name found: "LayerZero Labs".`
            )
        })

        it('correctly takes into account the version of the DVN', () => {
            expect(DVNsToAddresses(['Polyhedra'], 'polygon', metadata)).toStrictEqual([
                '0x8ddf05f9a5c488b4973897e278b58895bf87cb24',
            ])
        })

        it('should ignore deprecated DVNs incase of multiple DVNs', () => {
            expect(DVNsToAddresses(['Bitgo'], 'fuji', metadata)).toStrictEqual([
                '0xa1d84e5576299acda9ffed53195eadbe60d48e83',
            ])
        })

        it('should throw error if all DVNs are deprecated', () => {
            expect(() => DVNsToAddresses(['Deprec'], 'fuji', metadata)).toThrow(
                `Can't find DVN: "Deprec" on chainKey: "fuji". Double check you're using valid DVN canonical name (not an address).`
            )
        })
    })

    describe('resolveExecutor', () => {
        it('should return the address as-is if it starts with 0x', () => {
            expect(resolveExecutor('0x1234567890abcdef1234567890abcdef12345678', 'fuji', metadata)).toBe(
                '0x1234567890abcdef1234567890abcdef12345678'
            )
        })

        it('should return null if no executors are defined for the chain', () => {
            expect(resolveExecutor('CustomExecutor', 'fuji', metadata)).toBe(null)
        })

        it('should resolve executor name to address when custom executors are defined', () => {
            const metadataWithExecutors: IMetadata = {
                ...metadata,
                fuji: {
                    ...metadata.fuji!,
                    executors: {
                        '0xaaaa567890abcdef1234567890abcdef12345678': {
                            version: 2,
                            canonicalName: 'CustomExecutor',
                            id: 'custom-executor',
                        },
                        '0xbbbb567890abcdef1234567890abcdef12345678': {
                            version: 2,
                            canonicalName: 'AnotherExecutor',
                            id: 'another-executor',
                        },
                    },
                },
            }

            expect(resolveExecutor('CustomExecutor', 'fuji', metadataWithExecutors)).toBe(
                '0xaaaa567890abcdef1234567890abcdef12345678'
            )
            expect(resolveExecutor('AnotherExecutor', 'fuji', metadataWithExecutors)).toBe(
                '0xbbbb567890abcdef1234567890abcdef12345678'
            )
        })

        it('should return null if executor name not found in custom executors', () => {
            const metadataWithExecutors: IMetadata = {
                ...metadata,
                fuji: {
                    ...metadata.fuji!,
                    executors: {
                        '0xaaaa567890abcdef1234567890abcdef12345678': {
                            version: 2,
                            canonicalName: 'CustomExecutor',
                            id: 'custom-executor',
                        },
                    },
                },
            }

            expect(resolveExecutor('NonExistentExecutor', 'fuji', metadataWithExecutors)).toBe(null)
        })

        it('should skip deprecated executors', () => {
            const metadataWithExecutors: IMetadata = {
                ...metadata,
                fuji: {
                    ...metadata.fuji!,
                    executors: {
                        '0xaaaa567890abcdef1234567890abcdef12345678': {
                            version: 2,
                            canonicalName: 'CustomExecutor',
                            id: 'custom-executor',
                            deprecated: true,
                        },
                        '0xbbbb567890abcdef1234567890abcdef12345678': {
                            version: 2,
                            canonicalName: 'CustomExecutor',
                            id: 'custom-executor-new',
                        },
                    },
                },
            }

            // Should return the non-deprecated one
            expect(resolveExecutor('CustomExecutor', 'fuji', metadataWithExecutors)).toBe(
                '0xbbbb567890abcdef1234567890abcdef12345678'
            )
        })

        it('should only match version 2 executors', () => {
            const metadataWithExecutors: IMetadata = {
                ...metadata,
                fuji: {
                    ...metadata.fuji!,
                    executors: {
                        '0xaaaa567890abcdef1234567890abcdef12345678': {
                            version: 1,
                            canonicalName: 'CustomExecutor',
                            id: 'custom-executor-v1',
                        },
                        '0xbbbb567890abcdef1234567890abcdef12345678': {
                            version: 2,
                            canonicalName: 'CustomExecutor',
                            id: 'custom-executor-v2',
                        },
                    },
                },
            }

            // Should return the version 2 executor
            expect(resolveExecutor('CustomExecutor', 'fuji', metadataWithExecutors)).toBe(
                '0xbbbb567890abcdef1234567890abcdef12345678'
            )
        })
    })
})
