import fc from 'fast-check'
import { createProviderFactory } from '@/provider/factory'
import { endpointArbitrary } from '@layerzerolabs/test-devtools'
import { JsonRpcProvider } from '@ethersproject/providers'

// We'll use the fake timers to work around the fact that JsonRpcProvider uses setTimeout
// to schedule a task in the queue in its constructor
jest.useFakeTimers()

describe('provider/factory', () => {
    describe('createProviderFactory', () => {
        const errorArbitrary = fc.anything()
        const urlArbitrary = fc.webUrl()

        it('should reject if urlFactory throws', async () => {
            await fc.assert(
                fc.asyncProperty(errorArbitrary, endpointArbitrary, async (error, eid) => {
                    const urlFactory = jest.fn().mockImplementation(() => {
                        throw error
                    })
                    const providerFactory = createProviderFactory(urlFactory)

                    await expect(providerFactory(eid)).rejects.toBe(error)
                })
            )
        })

        it('should reject if urlFactory rejects', async () => {
            await fc.assert(
                fc.asyncProperty(errorArbitrary, endpointArbitrary, async (error, eid) => {
                    const urlFactory = jest.fn().mockRejectedValue(error)
                    const providerFactory = createProviderFactory(urlFactory)

                    await expect(providerFactory(eid)).rejects.toBe(error)
                })
            )
        })

        it('should resolve with JsonRpcProvider if urlFactory returns a URL', async () => {
            await fc.assert(
                fc.asyncProperty(urlArbitrary, endpointArbitrary, async (url, eid) => {
                    const urlFactory = jest.fn().mockReturnValue(url)
                    const providerFactory = createProviderFactory(urlFactory)
                    const provider = await providerFactory(eid)

                    expect(provider).toBeInstanceOf(JsonRpcProvider)
                    expect(provider.connection.url).toBe(url)
                })
            )
        })

        it('should resolve with JsonRpcProvider if urlFactory resolves with a URL', async () => {
            await fc.assert(
                fc.asyncProperty(urlArbitrary, endpointArbitrary, async (url, eid) => {
                    const urlFactory = jest.fn().mockResolvedValue(url)
                    const providerFactory = createProviderFactory(urlFactory)
                    const provider = await providerFactory(eid)

                    expect(provider).toBeInstanceOf(JsonRpcProvider)
                    expect(provider.connection.url).toBe(url)
                })
            )
        })
    })
})
