import { EndpointId } from '@layerzerolabs/lz-definitions'
import { getAddress } from '@ethersproject/address'
import { areBytes32Equal } from '@layerzerolabs/devtools'
import { configureReceiveLibraries, configureSendLibraries } from '@/oapp/config'
import type { OAppOmniGraph } from '@/oapp/types'

/**
 * Canary: checksum mismatch must not re-propose library txs after pin.
 *
 * On main (pre-fix), receive used strict `===`, so a checksummed on-chain
 * address vs lowercase config incorrectly proposed setReceiveLibrary → LZ_SameValue.
 * Send used toLowerCase(), so lowercase alone is not a send-path canary on main.
 */
describe('library checksum canary', () => {
    const from = { eid: EndpointId.ETHEREUM_V2_MAINNET, address: '0x1111111111111111111111111111111111111111' }
    const to = { eid: EndpointId.AVALANCHE_V2_MAINNET, address: '0x2222222222222222222222222222222222222222' }

    // Mixed-case checksum form (what ethers typically returns) vs lowercase (common in JSON configs)
    const libraryChecksummed = getAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    const libraryLower = libraryChecksummed.toLowerCase()

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
})
