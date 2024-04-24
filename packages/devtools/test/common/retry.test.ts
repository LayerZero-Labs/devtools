import { AsyncRetriable } from '@/common/retry'

describe('common/retry', () => {
    describe('AsyncRetriable', () => {
        describe('when LZ_ENABLE_EXPERIMENTAL_RETRY is off', () => {
            beforeAll(() => {
                // We'll enable the AsyncRetriable for these tests
                process.env.LZ_ENABLE_EXPERIMENTAL_RETRY = ''
            })

            it('shoult not retry', async () => {
                const error = new Error('Told ya')
                const handleRetry = jest.fn()
                const mock = jest.fn().mockRejectedValue(error)

                class WithAsyncRetriable {
                    @AsyncRetriable({ onRetry: handleRetry })
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                await expect(new WithAsyncRetriable().iAlwaysFail('y')).rejects.toBe(error)

                expect(mock).toHaveBeenCalledTimes(1)
                expect(handleRetry).not.toHaveBeenCalled()
            })

            it('should retry if enabled is set to true', async () => {
                const error = new Error('Told ya')
                const mock = jest.fn().mockRejectedValue(error)

                class WithAsyncRetriable {
                    @AsyncRetriable({ enabled: true })
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                await expect(new WithAsyncRetriable().iAlwaysFail('y')).rejects.toBe(error)

                expect(mock).toHaveBeenCalledTimes(3)
                expect(mock).toHaveBeenNthCalledWith(1, 'y')
                expect(mock).toHaveBeenNthCalledWith(2, 'y')
                expect(mock).toHaveBeenNthCalledWith(3, 'y')
            })

            it('should have access to non-prototype properties', async () => {
                const mock = jest.fn().mockResolvedValue(true)

                class WithAsyncRetriable {
                    constructor(protected readonly property = 7) {}

                    @AsyncRetriable({ enabled: true })
                    async iHaveAccessToProperties() {
                        return mock(this.property)
                    }
                }

                await expect(new WithAsyncRetriable().iHaveAccessToProperties()).resolves.toBe(true)

                expect(mock).toHaveBeenCalledTimes(1)
                expect(mock).toHaveBeenNthCalledWith(1, 7)
            })
        })

        describe('when LZ_ENABLE_EXPERIMENTAL_RETRY is on', () => {
            beforeAll(() => {
                // We'll enable the AsyncRetriable for these tests
                process.env.LZ_ENABLE_EXPERIMENTAL_RETRY = '1'
            })

            afterAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_RETRY = ''
            })

            it('should retry a method call 3 times by default', async () => {
                const error = new Error('Told ya')
                const mock = jest.fn().mockRejectedValue(error)

                class WithAsyncRetriable {
                    @AsyncRetriable()
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                await expect(new WithAsyncRetriable().iAlwaysFail('y')).rejects.toBe(error)

                expect(mock).toHaveBeenCalledTimes(3)
                expect(mock).toHaveBeenNthCalledWith(1, 'y')
                expect(mock).toHaveBeenNthCalledWith(2, 'y')
                expect(mock).toHaveBeenNthCalledWith(3, 'y')
            })

            it('should retry a method call N times if numAttempts is specified', async () => {
                const error = new Error('Told ya')
                const mock = jest.fn().mockRejectedValue(error)

                class WithAsyncRetriable {
                    @AsyncRetriable({ numAttempts: 2 })
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                await expect(new WithAsyncRetriable().iAlwaysFail('y')).rejects.toBe(error)

                expect(mock).toHaveBeenCalledTimes(2)
            })

            it('should stop retrying if the onRetry handler returns false', async () => {
                const error = new Error('Told ya')
                const mock = jest.fn().mockRejectedValue(error)
                const handleRetry = jest
                    .fn()
                    // We check that if we return undefined/void we'll keep trying
                    .mockReturnValueOnce(undefined)
                    // We check that if we return true we keep trying
                    .mockReturnValueOnce(true)
                    // After the third attempt we return false
                    .mockReturnValueOnce(false)

                class WithAsyncRetriable {
                    @AsyncRetriable({ numAttempts: 10_000, onRetry: handleRetry })
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                await expect(new WithAsyncRetriable().iAlwaysFail('y')).rejects.toBe(error)

                expect(mock).toHaveBeenCalledTimes(3)
                expect(handleRetry).toHaveBeenCalledTimes(3)
            })

            it('should call the onRetry callback if provided', async () => {
                const error = new Error('Told ya')
                const handleRetry = jest.fn()
                const mock = jest.fn().mockRejectedValue(error)

                class WithAsyncRetriable {
                    @AsyncRetriable({ onRetry: handleRetry })
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                const withAsyncRetriable = new WithAsyncRetriable()

                await expect(withAsyncRetriable.iAlwaysFail('y')).rejects.toBe(error)

                expect(handleRetry).toHaveBeenCalledTimes(3)
                expect(handleRetry).toHaveBeenNthCalledWith(1, 1, 3, error, withAsyncRetriable, 'iAlwaysFail', ['y'])
                expect(handleRetry).toHaveBeenNthCalledWith(2, 2, 3, error, withAsyncRetriable, 'iAlwaysFail', ['y'])
                expect(handleRetry).toHaveBeenNthCalledWith(3, 3, 3, error, withAsyncRetriable, 'iAlwaysFail', ['y'])
            })

            it('should resolve if the method resolves within the specified number of attempts', async () => {
                const error = new Error('Told ya')
                const value = {}
                const handleRetry = jest.fn()
                const mock = jest
                    .fn()
                    .mockRejectedValueOnce(error)
                    .mockRejectedValueOnce(error)
                    .mockResolvedValue(value)

                class WithAsyncRetriable {
                    @AsyncRetriable({ onRetry: handleRetry })
                    async iAlwaysFail(value: string) {
                        return mock(value)
                    }
                }

                const withAsyncRetriable = new WithAsyncRetriable()

                await expect(withAsyncRetriable.iAlwaysFail('y')).resolves.toBe(value)

                expect(handleRetry).toHaveBeenCalledTimes(2)
                expect(handleRetry).toHaveBeenNthCalledWith(1, 1, 3, error, withAsyncRetriable, 'iAlwaysFail', ['y'])
                expect(handleRetry).toHaveBeenNthCalledWith(2, 2, 3, error, withAsyncRetriable, 'iAlwaysFail', ['y'])
            })
        })
    })
})
