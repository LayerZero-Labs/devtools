import { withMutedConsole } from '@/stdio'
import fc from 'fast-check'

describe('stdio/console', () => {
    describe('withMutedConsole', () => {
        it('should return the value returned from the callback', async () => {
            await fc.assert(
                fc.asyncProperty(fc.anything(), async (value) => {
                    await expect(withMutedConsole(() => value)).resolves.toBe(value)
                })
            )
        })

        it('should return the value callback resolves with', async () => {
            await fc.assert(
                fc.asyncProperty(fc.anything(), async (value) => {
                    await expect(withMutedConsole(() => Promise.resolve(value))).resolves.toBe(value)
                })
            )
        })

        describe.each(['log', 'warn', 'info', 'error', 'debug'] as const)(`console.%s()`, (methodName) => {
            let consoleMock: jest.SpyInstance

            beforeEach(() => {
                consoleMock = jest.spyOn(console, methodName)
            })

            afterEach(() => {
                consoleMock.mockRestore()
            })

            it('should not call the original method', async () => {
                await withMutedConsole(() => console[methodName].apply(console, ['invisible harry potter']))

                expect(consoleMock).not.toHaveBeenCalled()
            })

            it('should restore the original method if the call does not throw', async () => {
                await withMutedConsole(() => console[methodName].apply(console, ['invisible harry potter']))

                console[methodName].apply(console, ['visible harry potter'])

                expect(consoleMock).toHaveBeenCalledTimes(1)
                expect(consoleMock).toHaveBeenCalledWith('visible harry potter')
            })

            it('should restore the original method if the call throws', async () => {
                await expect(
                    withMutedConsole(() => {
                        throw 'i threw'
                    })
                ).rejects.toBe('i threw')

                console[methodName].apply(console, ['visible harry potter'])

                expect(consoleMock).toHaveBeenCalledTimes(1)
                expect(consoleMock).toHaveBeenCalledWith('visible harry potter')
            })

            it('should restore the original method if the call rejects', async () => {
                await expect(withMutedConsole(() => Promise.reject('i threw'))).rejects.toBe('i threw')

                console[methodName].apply(console, ['visible harry potter'])

                expect(consoleMock).toHaveBeenCalledTimes(1)
                expect(consoleMock).toHaveBeenCalledWith('visible harry potter')
            })
        })
    })
})
