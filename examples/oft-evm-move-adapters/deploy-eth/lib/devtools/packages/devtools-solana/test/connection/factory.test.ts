import fc from 'fast-check'
import { createConnectionFactory, defaultRpcUrlFactory } from '@/connection/factory'
import { endpointArbitrary } from '@layerzerolabs/test-devtools'
import { Connection } from '@solana/web3.js'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { formatEid } from '@layerzerolabs/devtools'

describe('provider/factory', () => {
    describe('createConnectionFactory', () => {
        const errorArbitrary = fc.anything()
        const urlArbitrary = fc.webUrl()

        it('should reject if urlFactory throws', async () => {
            await fc.assert(
                fc.asyncProperty(errorArbitrary, endpointArbitrary, async (error, eid) => {
                    const urlFactory = jest.fn().mockImplementation(() => {
                        throw error
                    })
                    const providerFactory = createConnectionFactory(urlFactory)

                    await expect(providerFactory(eid)).rejects.toBe(error)
                })
            )
        })

        it('should reject if urlFactory rejects', async () => {
            await fc.assert(
                fc.asyncProperty(errorArbitrary, endpointArbitrary, async (error, eid) => {
                    const urlFactory = jest.fn().mockRejectedValue(error)
                    const providerFactory = createConnectionFactory(urlFactory)

                    await expect(providerFactory(eid)).rejects.toBe(error)
                })
            )
        })

        it('should resolve with Connection if urlFactory returns a URL', async () => {
            await fc.assert(
                fc.asyncProperty(urlArbitrary, endpointArbitrary, async (url, eid) => {
                    const urlFactory = jest.fn().mockReturnValue(url)
                    const connectionFactory = createConnectionFactory(urlFactory)
                    const connection = await connectionFactory(eid)

                    expect(connection).toBeInstanceOf(Connection)
                    expect(connection.rpcEndpoint).toBe(url)
                })
            )
        })

        it('should resolve with JsonRpcProvider if urlFactory resolves with a URL', async () => {
            await fc.assert(
                fc.asyncProperty(urlArbitrary, endpointArbitrary, async (url, eid) => {
                    const urlFactory = jest.fn().mockResolvedValue(url)
                    const connectionFactory = createConnectionFactory(urlFactory)
                    const connection = await connectionFactory(eid)

                    expect(connection).toBeInstanceOf(Connection)
                    expect(connection.rpcEndpoint).toBe(url)
                })
            )
        })
    })

    describe('defaultRpcUrlFactory', () => {
        it('should return https://api.mainnet-beta.solana.com for SOLANA_V2_MAINNET', () => {
            expect(defaultRpcUrlFactory(EndpointId.SOLANA_V2_MAINNET)).toBe(`https://api.mainnet-beta.solana.com`)
        })

        it('should return https://api.mainnet-beta.solana.com for SOLANA_MAINNET', () => {
            expect(defaultRpcUrlFactory(EndpointId.SOLANA_MAINNET)).toBe(`https://api.mainnet-beta.solana.com`)
        })

        it('should return https://api.testnet.solana.com for SOLANA_V2_TESTNET', () => {
            expect(defaultRpcUrlFactory(EndpointId.SOLANA_V2_TESTNET)).toBe(`https://api.devnet.solana.com`)
        })

        it('should return https://api.testnet.solana.com for SOLANA_TESTNET', () => {
            expect(defaultRpcUrlFactory(EndpointId.SOLANA_TESTNET)).toBe(`https://api.devnet.solana.com`)
        })

        it('should throw an error for other endpoints', () => {
            fc.assert(
                fc.property(endpointArbitrary, (eid) => {
                    fc.pre(eid !== EndpointId.SOLANA_V2_MAINNET)
                    fc.pre(eid !== EndpointId.SOLANA_V2_TESTNET)
                    fc.pre(eid !== EndpointId.SOLANA_MAINNET)
                    fc.pre(eid !== EndpointId.SOLANA_TESTNET)

                    expect(() => defaultRpcUrlFactory(eid)).toThrow(
                        `Could not find a default Solana RPC URL for eid ${eid} (${formatEid(eid)})`
                    )
                })
            )
        })
    })
})
