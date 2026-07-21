import { EndpointId } from '@layerzerolabs/lz-definitions'
import { getAddress } from '@ethersproject/address'
import { areBytes32Equal } from '@layerzerolabs/devtools'
import { configureReceiveLibraries, configureSendLibraries } from '@/oapp/config'
import type { OAppOmniGraph } from '@/oapp/types'

/**
 * Canary: checksum / encoding mismatch must not re-propose library txs after pin.
 *
 * On main (pre-fix), receive used strict `===`, so a checksummed on-chain
 * address vs lowercase config incorrectly proposed setReceiveLibrary → LZ_SameValue.
 * Send used toLowerCase(), so lowercase alone is not a send-path canary on main.
 *
 * Bare areBytes32Equal also throws on Solana base58 (hexZeroPad). Skip compares
 * must go through normalizePeer(local eid) first.
 */
describe('library checksum canary', () => {
    const from = { eid: EndpointId.ETHEREUM_V2_MAINNET, address: '0x1111111111111111111111111111111111111111' }
    const to = { eid: EndpointId.AVALANCHE_V2_MAINNET, address: '0x2222222222222222222222222222222222222222' }

    // Mixed-case checksum form (what ethers typically returns) vs lowercase (common in JSON configs)
    const libraryChecksummed = getAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    const libraryLower = libraryChecksummed.toLowerCase()

    // Solana ULN program id style address from examples/oapp-solana configs
    const solanaLibrary = '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH'
    const solanaFrom = {
        eid: EndpointId.SOLANA_V2_MAINNET,
        address: '11111111111111111111111111111111',
    }
    const solanaTo = {
        eid: EndpointId.ETHEREUM_V2_MAINNET,
        address: '0x2222222222222222222222222222222222222222',
    }

    it('documents that main-style === fails for receive checksum mismatch', () => {
        expect(libraryChecksummed).not.toBe(libraryLower)
        expect(libraryChecksummed.toLowerCase()).toBe(libraryLower)

        const mainReceiveWouldSkip = libraryChecksummed === libraryLower
        const mainSendWouldSkip = libraryChecksummed.toLowerCase() === libraryLower.toLowerCase()

        // This is the bug on main: receive skip misses, send skip does not.
        expect(mainReceiveWouldSkip).toBe(false)
        expect(mainSendWouldSkip).toBe(true)
        expect(areBytes32Equal(libraryChecksummed, libraryLower)).toBe(true)
    })

    it('documents that bare areBytes32Equal throws on Solana base58', () => {
        expect(() => areBytes32Equal(solanaLibrary, solanaLibrary)).toThrow()
    })

    it('configureReceiveLibraries skips when already pinned despite lowercase config', async () => {
        const setReceiveLibrary = jest.fn(async () => ({
            point: from,
            data: '0xdead',
        }))

        const sdkFactory = jest.fn(async () => ({
            getEndpointSDK: async () => ({
                getReceiveLibrary: async () => [libraryChecksummed, false] as const,
                setReceiveLibrary,
            }),
        }))

        const graph: OAppOmniGraph = {
            contracts: [{ point: from }, { point: to }],
            connections: [
                {
                    vector: { from, to },
                    config: {
                        receiveLibraryConfig: {
                            receiveLibrary: libraryLower,
                            gracePeriod: 0n,
                        },
                    },
                },
            ],
        }

        const txs = await configureReceiveLibraries(graph, sdkFactory as never)

        expect(txs).toEqual([])
        expect(setReceiveLibrary).not.toHaveBeenCalled()
    })

    it('configureSendLibraries skips when already pinned despite lowercase config', async () => {
        const setSendLibrary = jest.fn(async () => ({
            point: from,
            data: '0xdead',
        }))

        const sdkFactory = jest.fn(async () => ({
            getEndpointSDK: async () => ({
                isDefaultSendLibrary: async () => false,
                getSendLibrary: async () => libraryChecksummed,
                setSendLibrary,
            }),
        }))

        const graph: OAppOmniGraph = {
            contracts: [{ point: from }, { point: to }],
            connections: [
                {
                    vector: { from, to },
                    config: {
                        sendLibrary: libraryLower,
                    },
                },
            ],
        }

        const txs = await configureSendLibraries(graph, sdkFactory as never)

        expect(txs).toEqual([])
        expect(setSendLibrary).not.toHaveBeenCalled()
    })

    it('configureSendLibraries skips when already pinned with Solana base58 library', async () => {
        const setSendLibrary = jest.fn(async () => ({
            point: solanaFrom,
            data: '0xdead',
        }))

        const sdkFactory = jest.fn(async () => ({
            getEndpointSDK: async () => ({
                isDefaultSendLibrary: async () => false,
                getSendLibrary: async () => solanaLibrary,
                setSendLibrary,
            }),
        }))

        const graph: OAppOmniGraph = {
            contracts: [{ point: solanaFrom }, { point: solanaTo }],
            connections: [
                {
                    vector: { from: solanaFrom, to: solanaTo },
                    config: {
                        sendLibrary: solanaLibrary,
                    },
                },
            ],
        }

        const txs = await configureSendLibraries(graph, sdkFactory as never)

        expect(txs).toEqual([])
        expect(setSendLibrary).not.toHaveBeenCalled()
    })

    it('configureReceiveLibraries skips when already pinned with Solana base58 library', async () => {
        const setReceiveLibrary = jest.fn(async () => ({
            point: solanaFrom,
            data: '0xdead',
        }))

        const sdkFactory = jest.fn(async () => ({
            getEndpointSDK: async () => ({
                getReceiveLibrary: async () => [solanaLibrary, false] as const,
                setReceiveLibrary,
            }),
        }))

        const graph: OAppOmniGraph = {
            contracts: [{ point: solanaFrom }, { point: solanaTo }],
            connections: [
                {
                    vector: { from: solanaFrom, to: solanaTo },
                    config: {
                        receiveLibraryConfig: {
                            receiveLibrary: solanaLibrary,
                            gracePeriod: 0n,
                        },
                    },
                },
            ],
        }

        const txs = await configureReceiveLibraries(graph, sdkFactory as never)

        expect(txs).toEqual([])
        expect(setReceiveLibrary).not.toHaveBeenCalled()
    })
})
