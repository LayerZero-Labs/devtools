import { DVNsToAddresses, generateConnectionsConfig, translatePathwayToConfig } from '@/config-metadata'
import { IMetadataDvns, IMetadata, TwoWayConfig } from '@/types'

import fujiMetadata from './data/fuji.json'
import polygonMainnetMetadata from './data/polygon-mainnet.json'
import solanaMainnetMetadata from './data/solana-mainnet.json'
import solanaTestnetMetadata from './data/solana-testnet.json'

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

        it('should generate the connections config for a given set of pathways', async () => {
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

            const mockFetchMetadata = async () => metadata

            const config = await generateConnectionsConfig(pathways, mockFetchMetadata)
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
            const config = await generateConnectionsConfig(pathways, customFetchMetadata)
            console.log(config)
            expect(config).toMatchSnapshot()
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
})
